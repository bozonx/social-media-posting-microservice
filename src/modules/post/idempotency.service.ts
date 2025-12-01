import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { createHash } from 'crypto';
import { AppConfigService } from '../app-config/app-config.service';
import { PostRequestDto, PostResponseDto, ErrorResponseDto } from './dto';

interface IdempotencyRecord {
  status: 'processing' | 'completed';
  response?: PostResponseDto | ErrorResponseDto;
}

@Injectable()
export class IdempotencyService {
  private static readonly DEFAULT_IDEMPOTENCY_TTL_MINUTES = 10;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly appConfig: AppConfigService,
  ) {}

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

  async getRecord(key: string): Promise<IdempotencyRecord | undefined> {
    const record = await this.cache.get<IdempotencyRecord>(key);
    return record ?? undefined;
  }

  async setProcessing(key: string): Promise<void> {
    const record: IdempotencyRecord = { status: 'processing' };
    await this.cache.set(key, record, this.getTtlMs());
  }

  async setCompleted(key: string, response: PostResponseDto | ErrorResponseDto): Promise<void> {
    const record: IdempotencyRecord = { status: 'completed', response };
    await this.cache.set(key, record, this.getTtlMs());
  }

  private getTtlMs(): number {
    const common = this.appConfig.getCommonConfig();
    const minutes =
      typeof common.idempotencyTtlMinutes === 'number'
        ? common.idempotencyTtlMinutes
        : IdempotencyService.DEFAULT_IDEMPOTENCY_TTL_MINUTES;
    return minutes * 60_000;
  }
}
