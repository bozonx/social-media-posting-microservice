import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PostRequestDto, PostResponseDto, ErrorResponseDto } from './dto';
import { PostType, ErrorCode } from '../../common/enums';
import { AppConfigService } from '../app-config/app-config.service';
import { TelegramProvider } from '../providers/telegram/telegram.provider';
import { IdempotencyService } from './idempotency.service';
import { IProvider } from '../providers/base/provider.interface';

@Injectable()
export class PostService {
  private readonly logger = new Logger(PostService.name);

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly telegramProvider: TelegramProvider,
    private readonly idempotencyService: IdempotencyService,
  ) { }

  async publish(request: PostRequestDto): Promise<PostResponseDto | ErrorResponseDto> {
    const idempotencyKey = this.idempotencyService.buildKey(request);

    if (idempotencyKey) {
      const existing = await this.idempotencyService.getRecord(idempotencyKey);
      if (existing) {
        if (existing.status === 'processing') {
          throw new ConflictException(
            'Request with the same idempotencyKey is already being processed',
          );
        }

        if (existing.status === 'completed' && existing.response) {
          return existing.response;
        }
      }

      await this.idempotencyService.setProcessing(idempotencyKey);
    }

    const requestId = randomUUID();

    try {
      const channelConfig = this.getChannelConfig(request);

      if (channelConfig.provider !== request.platform) {
        throw new BadRequestException(
          `Channel provider "${channelConfig.provider}" does not match requested platform "${request.platform}"`,
        );
      }

      const provider = this.getProvider(request.platform);

      // Check if explicit type is supported
      const postType = request.type || PostType.AUTO;
      if (!provider.supportedTypes.includes(postType)) {
        throw new BadRequestException(
          `Post type "${postType}" is not supported by ${request.platform}`,
        );
      }

      this.logger.log(
        `Publishing to ${request.platform} via ${request.channel || 'inline auth'}, type: ${postType}`,
      );

      const result = await this.retryWithJitter(
        () => provider.publish(request, channelConfig),
        this.appConfig.getCommonConfig().retryAttempts,
        this.appConfig.getCommonConfig().retryDelayMs,
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
      this.logger.error(`Failed to publish to ${request.platform}: ${error.message}`, error.stack);

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

      if (idempotencyKey) {
        await this.idempotencyService.setCompleted(idempotencyKey, errorResponse);
      }

      return errorResponse;
    }
  }

  private getChannelConfig(request: PostRequestDto): any {
    if (request.channel) {
      return this.appConfig.getChannel(request.channel);
    }
    if (request.auth) {
      return {
        provider: request.platform,
        enabled: true,
        auth: request.auth,
      };
    }
    throw new BadRequestException('Either "channel" or "auth" must be provided');
  }

  private getProvider(platform: string): IProvider {
    switch (platform.toLowerCase()) {
      case 'telegram':
        return this.telegramProvider;
      default:
        throw new BadRequestException(`Provider "${platform}" is not supported`);
    }
  }

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

        const jitter = 0.8 + Math.random() * 0.4; // random(0.8, 1.2)
        const delay = Math.floor(baseDelayMs * jitter * attempt);

        this.logger.warn(
          `Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms: ${error.message}`,
        );

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

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

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
