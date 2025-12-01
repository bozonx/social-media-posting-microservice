import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException, Logger } from '@nestjs/common';
import { PostService } from '@/modules/post/post.service';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { TelegramProvider } from '@/modules/providers/telegram/telegram.provider';
import { IdempotencyService } from '@/modules/post/idempotency.service';
import type { PostRequestDto } from '@/modules/post/dto';
import { PostType } from '@/common/enums';

describe('PostService', () => {
  let service: PostService;
  let appConfigService: AppConfigService;
  let telegramProvider: TelegramProvider;
  let idempotencyService: IdempotencyService;

  const mockChannelConfig = {
    provider: 'telegram',
    enabled: true,
    auth: {
      botToken: 'test-token',
      chatId: 'test-chat-id',
    },
  };

  const mockCommonConfig = {
    retryAttempts: 3,
    retryDelayMs: 1000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        {
          provide: AppConfigService,
          useValue: {
            getChannel: jest.fn(),
            getCommonConfig: jest.fn().mockReturnValue(mockCommonConfig),
          },
        },
        {
          provide: TelegramProvider,
          useValue: {
            name: 'telegram',
            supportedTypes: [
              PostType.POST,
              PostType.IMAGE,
              PostType.VIDEO,
              PostType.ALBUM,
              PostType.DOCUMENT,
            ],
            publish: jest.fn(),
          },
        },
        {
          provide: IdempotencyService,
          useValue: {
            buildKey: jest.fn().mockReturnValue(null),
            getRecord: jest.fn(),
            setProcessing: jest.fn(),
            setCompleted: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PostService>(PostService);
    appConfigService = module.get<AppConfigService>(AppConfigService);
    telegramProvider = module.get<TelegramProvider>(TelegramProvider);
    idempotencyService = module.get<IdempotencyService>(IdempotencyService);

    // Подавляем логи в тестах
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('publish', () => {
    it('should successfully publish a post using channel config', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        channel: 'test-channel',
        body: 'Test message',
        type: PostType.POST,
      };

      const mockProviderResult = {
        postId: '12345',
        url: 'https://t.me/test/12345',
        raw: { message_id: 12345 },
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);
      (telegramProvider.publish as jest.Mock).mockResolvedValue(mockProviderResult);

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

      expect(result.data?.requestId).toBeDefined();
      expect(result.data?.publishedAt).toBeDefined();
      expect(appConfigService.getChannel).toHaveBeenCalledWith('test-channel');
      expect(telegramProvider.publish).toHaveBeenCalledWith(request, mockChannelConfig);
    });

    it('should successfully publish a post using inline auth', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        auth: {
          botToken: 'inline-token',
          chatId: 'inline-chat-id',
        },
        body: 'Test message',
        type: PostType.POST,
      };

      const mockProviderResult = {
        postId: '12345',
        url: 'https://t.me/test/12345',
        raw: { message_id: 12345 },
      };

      (telegramProvider.publish as jest.Mock).mockResolvedValue(mockProviderResult);

      const result = await service.publish(request);

      expect(result.success).toBe(true);
      expect(appConfigService.getChannel).not.toHaveBeenCalled();
      expect(telegramProvider.publish).toHaveBeenCalled();
    });

    it('should throw error if neither channel nor auth is provided', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
      };

      const result = await service.publish(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('Either "channel" or "auth" must be provided');
    });

    it('should throw error if platform does not match channel provider', async () => {
      const request: PostRequestDto = {
        platform: 'vk',
        channel: 'test-channel',
        body: 'Test message',
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);

      const result = await service.publish(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('does not match requested platform');
    });

    it('should throw error if post type is not supported', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        channel: 'test-channel',
        body: 'Test message',
        type: 'UNSUPPORTED_TYPE' as PostType,
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);

      const result = await service.publish(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('is not supported');
    });

    it('should return error response on publish failure', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        channel: 'test-channel',
        body: 'Test message',
      };

      const error = new Error('Publishing failed');

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);
      (telegramProvider.publish as jest.Mock).mockRejectedValue(error);

      const result = await service.publish(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Publishing failed');
      expect(result.error?.requestId).toBeDefined();
    });

    it('should retry on transient failures', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        channel: 'test-channel',
        body: 'Test message',
      };

      const mockProviderResult = {
        postId: '12345',
        url: 'https://t.me/test/12345',
        raw: { message_id: 12345 },
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);
      (telegramProvider.publish as jest.Mock)
        .mockRejectedValueOnce({ response: { status: 500 } })
        .mockResolvedValue(mockProviderResult);

      // Мокируем sleep чтобы тесты выполнялись быстро
      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

      const result = await service.publish(request);

      expect(result.success).toBe(true);
      expect(telegramProvider.publish).toHaveBeenCalledTimes(2);
    });

    it('should not retry on validation errors', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        channel: 'test-channel',
        body: 'Test message',
      };

      const error = new BadRequestException('Validation error');

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);
      (telegramProvider.publish as jest.Mock).mockRejectedValue(error);

      const result = await service.publish(request);

      expect(result.success).toBe(false);
      expect(telegramProvider.publish).toHaveBeenCalledTimes(1);
    });

    it('should return cached response when idempotent record exists with completed status', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        channel: 'test-channel',
        body: 'Test message',
        type: PostType.POST,
        idempotencyKey: 'idem-1',
      } as PostRequestDto;

      const cachedResponse = {
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
      } as any;

      (idempotencyService.buildKey as jest.Mock).mockReturnValue('idem-key');
      (idempotencyService.getRecord as jest.Mock).mockResolvedValue({
        status: 'completed',
        response: cachedResponse,
      });

      const result = await service.publish(request);

      expect(result).toEqual(cachedResponse);
      expect(telegramProvider.publish).not.toHaveBeenCalled();
      expect(idempotencyService.setProcessing).not.toHaveBeenCalled();
      expect(idempotencyService.setCompleted).not.toHaveBeenCalled();
    });

    it('should mark processing and save completed response for new idempotent request', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        channel: 'test-channel',
        body: 'Test message',
        type: PostType.POST,
        idempotencyKey: 'idem-1',
      } as PostRequestDto;

      const mockProviderResult = {
        postId: '12345',
        url: 'https://t.me/test/12345',
        raw: { message_id: 12345 },
      };

      (idempotencyService.buildKey as jest.Mock).mockReturnValue('idem-key');
      (idempotencyService.getRecord as jest.Mock).mockResolvedValue(undefined);
      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);
      (telegramProvider.publish as jest.Mock).mockResolvedValue(mockProviderResult);

      const result = await service.publish(request);

      expect(result.success).toBe(true);
      expect(idempotencyService.setProcessing).toHaveBeenCalledWith('idem-key');
      expect(idempotencyService.setCompleted).toHaveBeenCalledWith('idem-key', result);
      expect(telegramProvider.publish).toHaveBeenCalledTimes(1);
    });

    it('should return conflict when idempotent record is in processing state', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        channel: 'test-channel',
        body: 'Test message',
        type: PostType.POST,
        idempotencyKey: 'idem-1',
      } as PostRequestDto;

      (idempotencyService.buildKey as jest.Mock).mockReturnValue('idem-key');
      (idempotencyService.getRecord as jest.Mock).mockResolvedValue({
        status: 'processing',
      });

      const result = await service.publish(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('idempotencyKey is already being processed');
      expect(telegramProvider.publish).not.toHaveBeenCalled();
      expect(idempotencyService.setProcessing).not.toHaveBeenCalled();
      expect(idempotencyService.setCompleted).not.toHaveBeenCalled();
    });
  });

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

  describe('getErrorCode', () => {
    it('should return VALIDATION_ERROR for BadRequestException', () => {
      const error = new BadRequestException('test');
      const code = (service as any).getErrorCode(error);
      expect(code).toBe('VALIDATION_ERROR');
    });

    it('should return TIMEOUT_ERROR for network timeout', () => {
      const error = { code: 'ETIMEDOUT' };
      const code = (service as any).getErrorCode(error);
      expect(code).toBe('TIMEOUT_ERROR');
    });

    it('should return RATE_LIMIT_ERROR for 429 status', () => {
      const error = { response: { status: 429 } };
      const code = (service as any).getErrorCode(error);
      expect(code).toBe('RATE_LIMIT_ERROR');
    });

    it('should return PLATFORM_ERROR for 5xx status', () => {
      const error = { response: { status: 503 } };
      const code = (service as any).getErrorCode(error);
      expect(code).toBe('PLATFORM_ERROR');
    });

    it('should return AUTH_ERROR for 401 status', () => {
      const error = { response: { status: 401 } };
      const code = (service as any).getErrorCode(error);
      expect(code).toBe('AUTH_ERROR');
    });

    it('should return AUTH_ERROR for 403 status', () => {
      const error = { response: { status: 403 } };
      const code = (service as any).getErrorCode(error);
      expect(code).toBe('AUTH_ERROR');
    });

    it('should return PLATFORM_ERROR for unknown errors', () => {
      const error = new Error('Unknown error');
      const code = (service as any).getErrorCode(error);
      expect(code).toBe('PLATFORM_ERROR');
    });
  });

  describe('shouldRetry', () => {
    it('should return true for network timeout', () => {
      const error = { code: 'ETIMEDOUT' };
      const shouldRetry = (service as any).shouldRetry(error);
      expect(shouldRetry).toBe(true);
    });

    it('should return true for DNS errors', () => {
      const error = { code: 'ENOTFOUND' };
      const shouldRetry = (service as any).shouldRetry(error);
      expect(shouldRetry).toBe(true);
    });

    it('should return true for 5xx errors', () => {
      const error = { response: { status: 503 } };
      const shouldRetry = (service as any).shouldRetry(error);
      expect(shouldRetry).toBe(true);
    });

    it('should return true for rate limit errors', () => {
      const error = { response: { status: 429 } };
      const shouldRetry = (service as any).shouldRetry(error);
      expect(shouldRetry).toBe(true);
    });

    it('should return false for 4xx client errors', () => {
      const error = { response: { status: 400 } };
      const shouldRetry = (service as any).shouldRetry(error);
      expect(shouldRetry).toBe(false);
    });

    it('should return false for unknown errors', () => {
      const error = new Error('Unknown error');
      const shouldRetry = (service as any).shouldRetry(error);
      expect(shouldRetry).toBe(false);
    });
  });

  describe('retryWithJitter', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await (service as any).retryWithJitter(fn, 3, 1000);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry and eventually succeed', async () => {
      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
      const fn = jest
        .fn()
        .mockRejectedValueOnce({ response: { status: 500 } })
        .mockRejectedValueOnce({ response: { status: 500 } })
        .mockResolvedValue('success');

      const result = await (service as any).retryWithJitter(fn, 3, 100);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max attempts', async () => {
      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
      const fn = jest.fn().mockRejectedValue({ response: { status: 500 } });

      await expect((service as any).retryWithJitter(fn, 3, 100)).rejects.toEqual({
        response: { status: 500 },
      });

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not retry BadRequestException', async () => {
      const error = new BadRequestException('test');
      const fn = jest.fn().mockRejectedValue(error);

      await expect((service as any).retryWithJitter(fn, 3, 100)).rejects.toThrow(
        BadRequestException,
      );

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not retry non-transient errors', async () => {
      const error = { response: { status: 400 } };
      const fn = jest.fn().mockRejectedValue(error);

      await expect((service as any).retryWithJitter(fn, 3, 100)).rejects.toEqual(error);

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('sleep', () => {
    it('should delay execution', async () => {
      jest.useFakeTimers();

      const sleepPromise = (service as any).sleep(1000);
      jest.advanceTimersByTime(1000);
      await sleepPromise;

      jest.useRealTimers();
    });
  });
});
