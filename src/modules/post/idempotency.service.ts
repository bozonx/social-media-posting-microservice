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

interface IdempotencyRecordInternal extends IdempotencyRecord {
  /** Timestamp in milliseconds when record should be considered expired */
  expiresAt: number;
}

@Injectable()
export class IdempotencyService {
  /** Default TTL for idempotency records in cache (10 minutes) */
  private static readonly DEFAULT_IDEMPOTENCY_TTL_MINUTES = 10;

  /** In-memory map used for atomic idempotency lock management within a single process */
  private readonly records = new Map<string, IdempotencyRecordInternal>();

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly appConfig: AppConfigService,
  ) { }

  /**
   * Try to acquire processing lock for the given key or return existing record state.
   * This method is fully in-memory and synchronous, so it is safe from race conditions
   * inside a single Node.js process.
   *
   * @param key - Idempotency cache key
   * @returns
   *  - { acquired: true, status: 'processing' } when current request becomes the owner
   *  - { acquired: false, status: 'processing' } when another request is already processing
   *  - { acquired: false, status: 'completed', response } when a completed response is cached
   */
  acquireLock(
    key: string,
  ):
    | { acquired: true; status: 'processing' }
    | { acquired: false; status: 'processing' }
    | { acquired: false; status: 'completed'; response: PostResponseDto | ErrorResponseDto } {
    const now = Date.now();
    const ttlMs = this.getTtlMs();

    const existing = this.records.get(key);
    if (existing) {
      if (existing.expiresAt <= now) {
        this.records.delete(key);
      } else if (existing.status === 'processing') {
        return { acquired: false, status: 'processing' };
      } else if (existing.status === 'completed' && existing.response) {
        return {
          acquired: false,
          status: 'completed',
          response: existing.response,
        };
      }
    }

    const record: IdempotencyRecordInternal = {
      status: 'processing',
      expiresAt: now + ttlMs,
    };

    this.records.set(key, record);

    return { acquired: true, status: 'processing' };
  }

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
          account: request.account,
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
    try {
      const record = await this.cache.get<IdempotencyRecord>(key);
      if (record !== undefined && record !== null) {
        return record;
      }
    } catch {
      // Swallow cache errors and fall back to in-memory records
    }

    const internal = this.records.get(key);
    if (!internal) {
      return undefined;
    }

    if (internal.expiresAt <= Date.now()) {
      this.records.delete(key);
      return undefined;
    }

    return {
      status: internal.status,
      response: internal.response,
    };
  }

  /**
   * Mark request as processing in cache
   * Prevents duplicate processing of the same request
   * @param key - Idempotency cache key
   */
  async setProcessing(key: string): Promise<void> {
    const ttlMs = this.getTtlMs();
    const record: IdempotencyRecordInternal = {
      status: 'processing',
      expiresAt: Date.now() + ttlMs,
    };

    this.records.set(key, record);

    try {
      await this.cache.set(key, { status: 'processing' }, ttlMs);
    } catch {
      // Best-effort idempotency: ignore cache backend errors
    }
  }

  /**
   * Store completed request response in cache
   * @param key - Idempotency cache key
   * @param response - Response to cache (success or error)
   */
  async setCompleted(key: string, response: PostResponseDto | ErrorResponseDto): Promise<void> {
    const ttlMs = this.getTtlMs();
    const record: IdempotencyRecordInternal = {
      status: 'completed',
      response,
      expiresAt: Date.now() + ttlMs,
    };

    this.records.set(key, record);

    try {
      await this.cache.set(key, { status: 'completed', response }, ttlMs);
    } catch {
      // Best-effort idempotency: ignore cache backend errors
    }
  }

  /**
   * Get TTL for idempotency records in milliseconds
   * Uses configured value or default if not set
   * @returns TTL in milliseconds
   */
  private getTtlMs(): number {
    const minutes =
      typeof this.appConfig.idempotencyTtlMinutes === 'number'
        ? this.appConfig.idempotencyTtlMinutes
        : IdempotencyService.DEFAULT_IDEMPOTENCY_TTL_MINUTES;
    return minutes * 60_000;
  }
}
