import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { createHash } from 'crypto';
import { AppConfigService } from '../app-config/app-config.service.js';
import { PostRequestDto, PostResponseDto, ErrorResponseDto } from './dto/index.js';

/**
 * Idempotency record stored in cache
 * Tracks request processing status and cached response
 */
interface IdempotencyRecord {
  status: 'processing' | 'completed';
  response?: PostResponseDto | ErrorResponseDto;
}

@Injectable()
export class IdempotencyService {
  /** Default TTL for idempotency records in cache (10 minutes) */
  private static readonly DEFAULT_IDEMPOTENCY_TTL_MINUTES = 10;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly appConfig: AppConfigService,
  ) {}

  /**
   * Build idempotency cache key from request
   * Combines user-provided key with content hash for uniqueness
   * @param request - Post request
   * @returns Cache key or null if no idempotencyKey provided
   */
  buildKey(request: PostRequestDto): string | null {
    if (!request.idempotencyKey) {
      return null;
    }

    const hash = createHash('sha256')
      .update(
        JSON.stringify({
          platform: request.platform,
          channel: request.channel,
          auth: request.auth,
          body: request.body,
          type: request.type,
          media: request.media,
          video: request.video,
          audio: request.audio,
          document: request.document,
          cover: request.cover,
          options: request.options,
        }),
      )
      .digest('hex');

    return `idempotency:${request.idempotencyKey}:${hash}`;
  }

  /**
   * Get idempotency record from cache
   * @param key - Idempotency cache key
   * @returns Cached record or undefined if not found
   */
  async getRecord(key: string): Promise<IdempotencyRecord | undefined> {
    const record = await this.cache.get<IdempotencyRecord>(key);
    return record ?? undefined;
  }

  /**
   * Mark request as processing in cache
   * Prevents duplicate processing of the same request
   * @param key - Idempotency cache key
   */
  async setProcessing(key: string): Promise<void> {
    const record: IdempotencyRecord = { status: 'processing' };
    await this.cache.set(key, record, this.getTtlMs());
  }

  /**
   * Store completed request response in cache
   * @param key - Idempotency cache key
   * @param response - Response to cache (success or error)
   */
  async setCompleted(key: string, response: PostResponseDto | ErrorResponseDto): Promise<void> {
    const record: IdempotencyRecord = { status: 'completed', response };
    await this.cache.set(key, record, this.getTtlMs());
  }

  /**
   * Get TTL for idempotency records in milliseconds
   * Uses configured value or default if not set
   * @returns TTL in milliseconds
   */
  private getTtlMs(): number {
    const common = this.appConfig.getCommonConfig();
    const minutes =
      typeof common.idempotencyTtlMinutes === 'number'
        ? common.idempotencyTtlMinutes
        : IdempotencyService.DEFAULT_IDEMPOTENCY_TTL_MINUTES;
    return minutes * 60_000;
  }
}
