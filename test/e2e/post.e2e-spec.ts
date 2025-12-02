import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '@/app.module';
import { TelegramProvider } from '@/modules/providers/telegram/telegram.provider';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { IdempotencyService } from '@/modules/post/idempotency.service';
import { PostType } from '@/common/enums';

describe('PostController (e2e)', () => {
  let app: NestFastifyApplication;

  const mockTelegramProvider = {
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
    preview: jest.fn(),
    validate: jest.fn().mockResolvedValue({ success: true }),
    getPostStatus: jest.fn(),
  };

  const mockAppConfigService = {
    onModuleInit: jest.fn(),
    get: jest.fn(),
    getAllChannels: jest.fn().mockReturnValue({}),
    getChannel: jest.fn().mockImplementation(name => {
      if (name === 'test_channel') {
        return {
          provider: 'telegram',
          enabled: true,
          auth: {
            botToken: 'channel-token',
            chatId: 'channel-chat-id',
          },
        };
      }
      throw new Error(`Channel "${name}" not found`);
    }),
    getCommonConfig: jest.fn().mockReturnValue({
      retryAttempts: 1,
      retryDelayMs: 0,
    }),
    getConversionConfig: jest.fn().mockReturnValue({}),
  };

  const idempotencyCache = new Map<string, any>();
  const mockIdempotencyService = {
    buildKey: jest
      .fn()
      .mockImplementation(req => (req.idempotencyKey ? `key:${req.idempotencyKey}` : null)),
    getRecord: jest.fn().mockImplementation(key => Promise.resolve(idempotencyCache.get(key))),
    setProcessing: jest.fn().mockImplementation(key => {
      idempotencyCache.set(key, { status: 'processing' });
      return Promise.resolve();
    }),
    setCompleted: jest.fn().mockImplementation((key, response) => {
      idempotencyCache.set(key, { status: 'completed', response });
      return Promise.resolve();
    }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TelegramProvider)
      .useValue(mockTelegramProvider)
      .overrideProvider(AppConfigService)
      .useValue(mockAppConfigService)
      .overrideProvider(IdempotencyService)
      .useValue(mockIdempotencyService)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({
        logger: false,
      }),
    );

    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );

    const apiBasePath = (process.env.API_BASE_PATH || 'api').replace(/^\/+|\/+$/g, '');
    app.setGlobalPrefix(`${apiBasePath}/v1`);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    idempotencyCache.clear();
  });

  describe('POST /api/v1/post', () => {
    const endpoint = '/api/v1/post';

    it('should reject invalid request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('platform must be a string');
      expect(body.message).toContain('body must be a string');
    });

    it('should publish post with inline auth', async () => {
      const payload = {
        platform: 'telegram',
        body: 'Hello World',
        type: PostType.POST,
        auth: {
          botToken: 'mock-token',
          chatId: '123456',
        },
      };

      const mockResult = {
        postId: '100',
        url: 'https://t.me/test/100',
        raw: { message_id: 100 },
      };

      mockTelegramProvider.publish.mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        payload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        platform: 'telegram',
        type: PostType.POST,
        postId: mockResult.postId,
        url: mockResult.url,
      });

      expect(mockTelegramProvider.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'telegram',
          body: 'Hello World',
        }),
        expect.objectContaining({
          provider: 'telegram',
          auth: payload.auth,
        }),
      );
    });

    it('should fail when platform does not match provider', async () => {
      const payload = {
        platform: 'twitter', // Mismatch
        body: 'Hello World',
        auth: {
          botToken: 'mock-token',
          chatId: '123456',
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        payload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toMatch(/Provider "twitter" is not supported/i);
    });

    it('should fail when post type is not supported', async () => {
      const originalSupportedTypes = [...mockTelegramProvider.supportedTypes];
      mockTelegramProvider.supportedTypes = []; // Empty list

      const payload = {
        platform: 'telegram',
        body: 'Hello World',
        type: PostType.POST,
        auth: {
          botToken: 'mock-token',
          chatId: '123456',
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        payload,
      });

      mockTelegramProvider.supportedTypes = originalSupportedTypes;

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toMatch(/Post type "post" is not supported by telegram/i);
    });

    it('should publish using channel config', async () => {
      const payload = {
        platform: 'telegram',
        channel: 'test_channel',
        body: 'Message via channel',
        type: PostType.POST,
      };

      const mockResult = {
        postId: '200',
        url: 'https://t.me/test/200',
        raw: { message_id: 200 },
      };

      mockTelegramProvider.publish.mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        payload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.postId).toBe('200');

      expect(mockTelegramProvider.publish).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          provider: 'telegram',
          auth: {
            botToken: 'channel-token',
            chatId: 'channel-chat-id',
          },
        }),
      );
    });

    it('should handle provider errors gracefully', async () => {
      const payload = {
        platform: 'telegram',
        body: 'Error test',
        type: PostType.POST,
        auth: { botToken: 't', chatId: 'c' },
      };

      const providerError = new Error('Telegram API Error');
      (providerError as any).response = { status: 500, data: { description: 'Internal Error' } };
      mockTelegramProvider.publish.mockRejectedValue(providerError);

      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        payload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('PLATFORM_ERROR');
      expect(body.error.message).toBe('Telegram API Error');
    });

    it('should return cached response for idempotent requests', async () => {
      const payload = {
        platform: 'telegram',
        body: 'Idempotency test',
        type: PostType.POST,
        auth: { botToken: 't', chatId: 'c' },
        idempotencyKey: 'unique-key-123',
      };

      const mockResult = {
        postId: '300',
        url: 'https://t.me/test/300',
        raw: { message_id: 300 },
      };

      // Mock implementation to track calls
      mockTelegramProvider.publish.mockResolvedValue(mockResult);

      // First request
      const response1 = await app.inject({
        method: 'POST',
        url: endpoint,
        payload,
      });

      expect(response1.statusCode).toBe(200);
      expect(JSON.parse(response1.body).success).toBe(true);

      // Second request with same key
      const response2 = await app.inject({
        method: 'POST',
        url: endpoint,
        payload,
      });

      expect(response2.statusCode).toBe(200);
      const body2 = JSON.parse(response2.body);
      expect(body2.success).toBe(true);
      expect(body2.data.postId).toBe('300');

      // Provider should be called only ONCE
      expect(mockTelegramProvider.publish).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/v1/preview', () => {
    const endpoint = '/api/v1/preview';

    it('should return preview data', async () => {
      const payload = {
        platform: 'telegram',
        body: '**Bold text**',
        bodyFormat: 'md',
        channel: 'test_channel',
      };

      const mockPreviewData = {
        valid: true,
        detectedType: 'post',
        convertedBody: '<b>Bold text</b>',
        targetFormat: 'html',
        convertedBodyLength: 16,
        warnings: [],
      };

      // PreviewService returns provider.preview() result directly
      mockTelegramProvider.preview.mockResolvedValue({
        success: true,
        data: mockPreviewData,
      });

      const response = await app.inject({
        method: 'POST',
        url: endpoint,
        payload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockPreviewData);
    });
  });
});
