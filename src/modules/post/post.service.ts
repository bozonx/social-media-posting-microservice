import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PostRequestDto, PostResponseDto, ErrorResponseDto } from './dto/index.js';
import { PostType, ErrorCode } from '../../common/enums/index.js';
import { AppConfigService } from '../app-config/app-config.service.js';
import { IdempotencyService } from './idempotency.service.js';
import { ProviderRegistry } from '../providers/base/provider-registry.service.js';
import { AuthValidatorRegistry } from '../providers/base/auth-validator-registry.service.js';
import { BasePostService, ResolvedChannelConfig } from './base-post.service.js';

@Injectable()
export class PostService extends BasePostService {
  protected readonly logger = new Logger(PostService.name);
  /** Minimum jitter factor for retry delay randomization (80%) */
  private static readonly MIN_JITTER_FACTOR = 0.8;
  /** Maximum jitter factor for retry delay randomization (120%) */
  private static readonly MAX_JITTER_FACTOR = 1.2;
  private static readonly DEFAULT_REQUEST_TIMEOUT_SECS = 60;
  private static readonly MAX_REQUEST_TIMEOUT_SECS = 600;

  constructor(
    appConfig: AppConfigService,
    providerRegistry: ProviderRegistry,
    authValidatorRegistry: AuthValidatorRegistry,
    private readonly idempotencyService: IdempotencyService,
  ) {
    super(appConfig, providerRegistry, authValidatorRegistry);
  }

  /**
   * Publish a post to a social media platform
   * Handles idempotency, provider selection, retry logic, and error handling
   * @param request - Post request with platform, content, and media
   * @returns Success response with post details or error response
   */
  async publish(request: PostRequestDto): Promise<PostResponseDto | ErrorResponseDto> {
    const idempotencyKey = this.idempotencyService.buildKey(request);
    let idempotencyLocked = false;

    if (idempotencyKey) {
      const lock = this.idempotencyService.acquireLock(idempotencyKey);

      if (!lock.acquired) {
        if (lock.status === 'processing') {
          throw new ConflictException(
            'Request with the same idempotencyKey is already being processed',
          );
        }

        if (lock.status === 'completed' && lock.response) {
          return lock.response;
        }
      }

      idempotencyLocked = lock.acquired;
    }

    const requestId = randomUUID();

    try {
      const { provider, channelConfig } = this.validateRequest(request);
      const commonConfig = this.appConfig.getCommonConfig();
      const providerTimeoutMs = this.getProviderTimeoutMs(commonConfig?.providerTimeoutSecs);
      const requestTimeoutMs = this.getRequestTimeoutMs(commonConfig?.incomingRequestTimeoutSecs);

      // Check if explicit type is supported
      const postType = request.type || PostType.AUTO;
      if (!provider.supportedTypes.includes(postType)) {
        throw new BadRequestException(
          `Post type "${postType}" is not supported by ${request.platform}`,
        );
      }

      this.logger.log({
        message: `Publishing to ${request.platform} via ${channelConfig.source === 'channel' ? request.channel : 'inline auth'}, type: ${postType}`,
        metadata: {
          requestId,
          platform: request.platform,
          channel: request.channel,
          type: postType,
        },
      });

      const result = await this.executeWithRequestTimeout(
        () =>
          this.retryWithJitter(
            () =>
              this.maybeExecuteWithTimeout(
                () => provider.publish(request, channelConfig),
                providerTimeoutMs,
              ),
            commonConfig.retryAttempts,
            commonConfig.retryDelayMs,
          ),
        requestTimeoutMs,
      );

      const response: PostResponseDto = {
        success: true,
        data: {
          postId: result.postId,
          url: result.url,
          platform: request.platform,
          type: postType,
          publishedAt: new Date().toISOString(),
          raw: result.raw,
          requestId,
        },
      };

      if (idempotencyKey) {
        await this.idempotencyService.setCompleted(idempotencyKey, response);
      }

      return response;
    } catch (error: any) {
      // Log full error with stack trace for debugging
      this.logger.error({
        message: `Failed to publish to ${request.platform}: ${error?.message ?? 'Unknown error'}`,
        metadata: {
          requestId,
          platform: request.platform,
          channel: request.channel,
          type: request.type,
        },
        err: error, // Full error object with stack trace
      });

      const errorResponse: ErrorResponseDto = {
        success: false,
        error: {
          code: this.getErrorCode(error),
          message: error.message,
          details: error.response?.data,
          raw: error.response,
          requestId,
        },
      };

      // Always update idempotency record if we locked it
      if (idempotencyKey && idempotencyLocked) {
        await this.idempotencyService.setCompleted(idempotencyKey, errorResponse);
      }

      return errorResponse;
    }
  }

  /**
   * Map error to appropriate error code
   * Categorizes errors for better error handling and monitoring
   * @param error - Error object
   * @returns Error code string
   */
  private getErrorCode(error: any): string {
    if (error instanceof BadRequestException) {
      return ErrorCode.VALIDATION_ERROR;
    }
    if (error instanceof ConflictException) {
      return ErrorCode.VALIDATION_ERROR;
    }
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return ErrorCode.TIMEOUT_ERROR;
    }
    if (error.response?.status === 429) {
      return ErrorCode.RATE_LIMIT_ERROR;
    }
    if (error.response?.status >= 500) {
      return ErrorCode.PLATFORM_ERROR;
    }
    if (error.response?.status === 401 || error.response?.status === 403) {
      return ErrorCode.AUTH_ERROR;
    }
    return ErrorCode.PLATFORM_ERROR;
  }

  private getRequestTimeoutMs(incomingRequestTimeoutSecs: number | undefined): number {
    const defaultSecs = PostService.DEFAULT_REQUEST_TIMEOUT_SECS;
    const maxSecs = PostService.MAX_REQUEST_TIMEOUT_SECS;

    const normalizedSecs =
      typeof incomingRequestTimeoutSecs === 'number' && incomingRequestTimeoutSecs > 0
        ? incomingRequestTimeoutSecs
        : defaultSecs;

    if (normalizedSecs > maxSecs) {
      throw new Error(`incomingRequestTimeoutSecs must not exceed ${maxSecs} seconds`);
    }

    return normalizedSecs * 1000;
  }

  private getProviderTimeoutMs(providerTimeoutSecs: number | undefined): number | undefined {
    const maxSecs = PostService.MAX_REQUEST_TIMEOUT_SECS;

    if (typeof providerTimeoutSecs !== 'number' || providerTimeoutSecs <= 0) {
      return undefined;
    }

    if (providerTimeoutSecs > maxSecs) {
      throw new Error(`providerTimeoutSecs must not exceed ${maxSecs} seconds`);
    }

    return providerTimeoutSecs * 1000;
  }

  private maybeExecuteWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number | undefined,
  ): Promise<T> {
    if (!timeoutMs) {
      return fn();
    }

    return this.executeWithRequestTimeout(fn, timeoutMs);
  }

  private async executeWithRequestTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race<T>([
        fn(),
        new Promise<T>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            const error: any = new Error(`Request timed out after ${timeoutMs}ms`);
            error.code = 'ETIMEDOUT';
            reject(error);
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  /**
   * Retry function with exponential backoff and jitter
   * Implements retry logic with randomized delays to avoid thundering herd
   * @param fn - Async function to retry
   * @param maxAttempts - Maximum number of attempts
   * @param baseDelayMs - Base delay in milliseconds
   * @returns Result of successful function execution
   * @throws Last error if all attempts fail
   */
  private async retryWithJitter<T>(
    fn: () => Promise<T>,
    maxAttempts: number,
    baseDelayMs: number,
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        if (error instanceof BadRequestException) {
          throw error;
        }

        if (attempt === maxAttempts) {
          break;
        }

        const shouldRetry = this.shouldRetry(error);
        if (!shouldRetry) {
          throw error;
        }

        const jitterRange = PostService.MAX_JITTER_FACTOR - PostService.MIN_JITTER_FACTOR;
        const jitter = PostService.MIN_JITTER_FACTOR + Math.random() * jitterRange; // random(0.8, 1.2)
        const delay = Math.floor(baseDelayMs * jitter * attempt);

        this.logger.warn({
          message: `Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms: ${error?.message ?? 'Unknown error'}`,
          metadata: {
            attempt,
            maxAttempts,
            delay,
            error: error?.stack,
          },
        });

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Determine if an error should trigger a retry
   * Retries on network errors, server errors, and rate limits
   * @param error - Error object
   * @returns True if should retry, false otherwise
   */
  private shouldRetry(error: any): boolean {
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return true;
    }
    if (error.response?.status >= 500) {
      return true;
    }
    if (error.response?.status === 429) {
      return true;
    }
    return false;
  }

  /**
   * Sleep for specified milliseconds
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
