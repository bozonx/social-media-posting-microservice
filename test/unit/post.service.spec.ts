import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException, Logger } from '@nestjs/common';
import { PostService } from '@/modules/post/post.service.js';
import { AppConfigService } from '@/modules/app-config/app-config.service.js';
import { TelegramProvider } from '@/modules/providers/telegram/telegram.provider.js';
import { IdempotencyService } from '@/modules/post/idempotency.service.js';
import type { PostRequestDto, PostResponseDto } from '@/modules/post/dto/index.js';
import { PostType } from '@/common/enums/index.js';

// =============================================================================
// Mock Factories
// =============================================================================

interface ChannelConfig {
  provider: string;
  enabled: boolean;
  auth: { botToken: string; chatId: string };
}

interface CommonConfig {
  retryAttempts: number;
  retryDelayMs: number;
}

interface ProviderResult {
  postId: string;
  url: string;
  raw: Record<string, unknown>;
}

const createChannelConfig = (overrides: Partial<ChannelConfig> = {}): ChannelConfig => ({
  provider: 'telegram',
  enabled: true,
  auth: {
    botToken: 'test-token',
    chatId: 'test-chat-id',
  },
  ...overrides,
});

const createCommonConfig = (overrides: Partial<CommonConfig> = {}): CommonConfig => ({
  retryAttempts: 3,
  retryDelayMs: 1000,
  ...overrides,
});

const createProviderResult = (overrides: Partial<ProviderResult> = {}): ProviderResult => ({
  postId: '12345',
  url: 'https://t.me/test/12345',
  raw: { message_id: 12345 },
  ...overrides,
});

const createPostRequest = (overrides: Partial<PostRequestDto> = {}): PostRequestDto => ({
  platform: 'telegram',
  channel: 'test-channel',
  body: 'Test message',
  type: PostType.POST,
  ...overrides,
});

const createMockAppConfigService = (channelConfig: ChannelConfig, commonConfig: CommonConfig) => ({
  getChannel: jest.fn().mockReturnValue(channelConfig),
  getCommonConfig: jest.fn().mockReturnValue(commonConfig),
});

const createMockTelegramProvider = () => ({
  name: 'telegram',
  supportedTypes: [
    PostType.AUTO,
    PostType.POST,
    PostType.IMAGE,
    PostType.VIDEO,
    PostType.ALBUM,
    PostType.DOCUMENT,
  ],
  publish: jest.fn(),
});

const createMockIdempotencyService = () => ({
  buildKey: jest.fn().mockReturnValue(null),
  getRecord: jest.fn(),
  setProcessing: jest.fn(),
  setCompleted: jest.fn(),
});

// =============================================================================
// Test Suite
// =============================================================================

describe('PostService', () => {
  let service: PostService;
  let appConfigService: jest.Mocked<AppConfigService>;
  let telegramProvider: jest.Mocked<TelegramProvider>;
  let idempotencyService: jest.Mocked<IdempotencyService>;

  const channelConfig = createChannelConfig();
  const commonConfig = createCommonConfig();

  beforeEach(async () => {
    const mockAppConfig = createMockAppConfigService(channelConfig, commonConfig);
    const mockTelegram = createMockTelegramProvider();
    const mockIdempotency = createMockIdempotencyService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        { provide: AppConfigService, useValue: mockAppConfig },
        { provide: TelegramProvider, useValue: mockTelegram },
        { provide: IdempotencyService, useValue: mockIdempotency },
      ],
    }).compile();

    service = module.get<PostService>(PostService);
    appConfigService = module.get(AppConfigService);
    telegramProvider = module.get(TelegramProvider);
    idempotencyService = module.get(IdempotencyService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // publish()
  // ===========================================================================

  describe('publish', () => {
    describe('successful publishing', () => {
      it('should publish using channel config', async () => {
        const request = createPostRequest();
        const providerResult = createProviderResult();

        telegramProvider.publish.mockResolvedValue(providerResult);

        const result = await service.publish(request);

        expect(result).toMatchObject({
          success: true,
          data: {
            postId: '12345',
            url: 'https://t.me/test/12345',
            platform: 'telegram',
            type: PostType.POST,
            raw: { message_id: 12345 },
          },
        });
        expect((result as PostResponseDto).data?.requestId).toBeDefined();
        expect((result as PostResponseDto).data?.publishedAt).toBeDefined();
        expect(appConfigService.getChannel).toHaveBeenCalledWith('test-channel');
        expect(telegramProvider.publish).toHaveBeenCalledWith(request, channelConfig);
      });

      it('should publish using inline auth', async () => {
        const request = createPostRequest({
          channel: undefined,
          auth: { botToken: 'inline-token', chatId: 'inline-chat-id' },
        });
        const providerResult = createProviderResult();

        telegramProvider.publish.mockResolvedValue(providerResult);

        const result = await service.publish(request);

        expect(result.success).toBe(true);
        expect(appConfigService.getChannel).not.toHaveBeenCalled();
        expect(telegramProvider.publish).toHaveBeenCalled();
      });
    });

    describe('validation errors', () => {
      it('should fail when neither channel nor auth is provided', async () => {
        const request = createPostRequest({ channel: undefined });

        const result = await service.publish(request);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('VALIDATION_ERROR');
        expect(result.error?.message).toContain('Either "channel" or "auth" must be provided');
      });

      it('should fail when platform does not match channel provider', async () => {
        const request = createPostRequest({ platform: 'vk' });

        const result = await service.publish(request);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('VALIDATION_ERROR');
        expect(result.error?.message).toContain('does not match requested platform');
      });

      it('should fail when post type is not supported', async () => {
        const request = createPostRequest({ type: 'UNSUPPORTED_TYPE' as PostType });

        const result = await service.publish(request);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('VALIDATION_ERROR');
        expect(result.error?.message).toContain('is not supported');
      });
    });

    describe('error handling', () => {
      it('should return error response on publish failure', async () => {
        const request = createPostRequest();
        const error = new Error('Publishing failed');

        telegramProvider.publish.mockRejectedValue(error);

        const result = await service.publish(request);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.message).toBe('Publishing failed');
        expect(result.error?.requestId).toBeDefined();
      });
    });

    describe('retry behavior', () => {
      beforeEach(() => {
        jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
      });

      it('should retry on transient failures', async () => {
        const request = createPostRequest();
        const providerResult = createProviderResult();

        telegramProvider.publish
          .mockRejectedValueOnce({ response: { status: 500 } })
          .mockResolvedValue(providerResult);

        const result = await service.publish(request);

        expect(result.success).toBe(true);
        expect(telegramProvider.publish).toHaveBeenCalledTimes(2);
      });

      it('should not retry on validation errors', async () => {
        const request = createPostRequest();
        const error = new BadRequestException('Validation error');

        telegramProvider.publish.mockRejectedValue(error);

        const result = await service.publish(request);

        expect(result.success).toBe(false);
        expect(telegramProvider.publish).toHaveBeenCalledTimes(1);
      });
    });

    describe('idempotency', () => {
      const idempotentRequest = createPostRequest({ idempotencyKey: 'idem-1' } as any);

      it('should return cached response when record is completed', async () => {
        const cachedResponse: PostResponseDto = {
          success: true,
          data: {
            postId: 'cached',
            url: 'https://t.me/test/cached',
            platform: 'telegram',
            type: PostType.POST,
            publishedAt: new Date().toISOString(),
            requestId: 'cached-req',
            raw: {},
          },
        };

        idempotencyService.buildKey.mockReturnValue('idem-key');
        idempotencyService.getRecord.mockResolvedValue({
          status: 'completed',
          response: cachedResponse,
        });

        const result = await service.publish(idempotentRequest);

        expect(result).toEqual(cachedResponse);
        expect(telegramProvider.publish).not.toHaveBeenCalled();
        expect(idempotencyService.setProcessing).not.toHaveBeenCalled();
        expect(idempotencyService.setCompleted).not.toHaveBeenCalled();
      });

      it('should mark processing and save response for new request', async () => {
        const providerResult = createProviderResult();

        idempotencyService.buildKey.mockReturnValue('idem-key');
        idempotencyService.getRecord.mockResolvedValue(undefined);
        telegramProvider.publish.mockResolvedValue(providerResult);

        const result = await service.publish(idempotentRequest);

        expect(result.success).toBe(true);
        expect(idempotencyService.setProcessing).toHaveBeenCalledWith('idem-key');
        expect(idempotencyService.setCompleted).toHaveBeenCalledWith('idem-key', result);
        expect(telegramProvider.publish).toHaveBeenCalledTimes(1);
      });

      it('should throw ConflictException when record is processing', async () => {
        idempotencyService.buildKey.mockReturnValue('idem-key');
        idempotencyService.getRecord.mockResolvedValue({ status: 'processing' });

        await expect(service.publish(idempotentRequest)).rejects.toThrow(
          'Request with the same idempotencyKey is already being processed',
        );

        expect(telegramProvider.publish).not.toHaveBeenCalled();
        expect(idempotencyService.setProcessing).not.toHaveBeenCalled();
        expect(idempotencyService.setCompleted).not.toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // getProvider()
  // ===========================================================================

  describe('getProvider', () => {
    it('should return telegram provider for telegram platform', () => {
      const provider = (service as any).getProvider('telegram');
      expect(provider).toBe(telegramProvider);
    });

    it('should throw error for unsupported platform', () => {
      expect(() => (service as any).getProvider('unsupported')).toThrow(
        'Provider "unsupported" is not supported',
      );
    });
  });

  // ===========================================================================
  // getErrorCode()
  // ===========================================================================

  describe('getErrorCode', () => {
    const getErrorCode = (error: unknown): string => (service as any).getErrorCode(error);

    it.each([
      [new BadRequestException('test'), 'VALIDATION_ERROR'],
      [{ code: 'ETIMEDOUT' }, 'TIMEOUT_ERROR'],
      [{ response: { status: 429 } }, 'RATE_LIMIT_ERROR'],
      [{ response: { status: 503 } }, 'PLATFORM_ERROR'],
      [{ response: { status: 401 } }, 'AUTH_ERROR'],
      [{ response: { status: 403 } }, 'AUTH_ERROR'],
      [new Error('Unknown error'), 'PLATFORM_ERROR'],
    ])('should return correct error code for %p', (error, expectedCode) => {
      expect(getErrorCode(error)).toBe(expectedCode);
    });
  });

  // ===========================================================================
  // shouldRetry()
  // ===========================================================================

  describe('shouldRetry', () => {
    const shouldRetry = (error: unknown): boolean => (service as any).shouldRetry(error);

    describe('retryable errors', () => {
      it.each([
        [{ code: 'ETIMEDOUT' }, 'network timeout'],
        [{ code: 'ENOTFOUND' }, 'DNS error'],
        [{ response: { status: 503 } }, '5xx server error'],
        [{ response: { status: 429 } }, 'rate limit error'],
      ])('should return true for %p (%s)', (error, _description) => {
        expect(shouldRetry(error)).toBe(true);
      });
    });

    describe('non-retryable errors', () => {
      it.each([
        [{ response: { status: 400 } }, '4xx client error'],
        [new Error('Unknown error'), 'unknown error'],
      ])('should return false for %p (%s)', (error, _description) => {
        expect(shouldRetry(error)).toBe(false);
      });
    });
  });

  // ===========================================================================
  // retryWithJitter()
  // ===========================================================================

  describe('retryWithJitter', () => {
    const retryWithJitter = <T>(fn: () => Promise<T>, maxAttempts = 3, baseDelayMs = 100) =>
      (service as any).retryWithJitter(fn, maxAttempts, baseDelayMs);

    beforeEach(() => {
      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
    });

    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await retryWithJitter(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry and eventually succeed', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce({ response: { status: 500 } })
        .mockRejectedValueOnce({ response: { status: 500 } })
        .mockResolvedValue('success');

      const result = await retryWithJitter(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max attempts', async () => {
      const serverError = { response: { status: 500 } };
      const fn = jest.fn().mockRejectedValue(serverError);

      await expect(retryWithJitter(fn)).rejects.toEqual(serverError);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    describe('non-retryable errors', () => {
      it('should not retry BadRequestException', async () => {
        const fn = jest.fn().mockRejectedValue(new BadRequestException('test'));

        await expect(retryWithJitter(fn)).rejects.toThrow(BadRequestException);
        expect(fn).toHaveBeenCalledTimes(1);
      });

      it('should not retry 4xx client errors', async () => {
        const clientError = { response: { status: 400 } };
        const fn = jest.fn().mockRejectedValue(clientError);

        await expect(retryWithJitter(fn)).rejects.toEqual(clientError);
        expect(fn).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ===========================================================================
  // sleep()
  // ===========================================================================

  describe('sleep', () => {
    it('should delay execution for specified duration', async () => {
      jest.useFakeTimers();

      const sleepPromise = (service as any).sleep(1000);
      jest.advanceTimersByTime(1000);
      await sleepPromise;

      jest.useRealTimers();
    });
  });
});
