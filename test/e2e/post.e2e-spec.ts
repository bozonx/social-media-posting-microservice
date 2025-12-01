import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '@/app.module';
import { TelegramProvider } from '@/modules/providers/telegram/telegram.provider';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { PostType } from '@/common/enums';

describe('PostController (e2e)', () => {
  let app: NestFastifyApplication;

  const mockTelegramProvider = {
    name: 'telegram',
    supportedTypes: [
      PostType.POST,
      PostType.IMAGE,
      PostType.VIDEO,
      PostType.ALBUM,
      PostType.DOCUMENT,
    ],
    publish: jest.fn(),
  };

  const mockAppConfigService = {
    getChannel: jest.fn(),
    getCommonConfig: jest.fn().mockReturnValue({
      retryAttempts: 1,
      retryDelayMs: 0,
    }),
    getConversionConfig: jest.fn().mockReturnValue({}),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TelegramProvider)
      .useValue(mockTelegramProvider)
      .overrideProvider(AppConfigService)
      .useValue(mockAppConfigService)
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
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
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
  });
});
