import { Test, type TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PreviewService } from '@/modules/post/preview.service';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { ConverterService } from '@/modules/converter/converter.service';
import { TelegramTypeDetector } from '@/modules/providers/telegram/telegram-type-detector.service';
import { MediaService } from '@/modules/media/media.service';
import type { PostRequestDto } from '@/modules/post/dto';
import { PostType, BodyFormat } from '@/common/enums';

describe('PreviewService', () => {
  let service: PreviewService;
  let appConfigService: AppConfigService;
  let converterService: ConverterService;
  let telegramTypeDetector: TelegramTypeDetector;
  let mediaService: MediaService;

  const mockChannelConfig = {
    provider: 'telegram',
    enabled: true,
    auth: {
      botToken: 'test-token',
      chatId: 'test-chat-id',
    },
    parseMode: 'HTML',
    maxTextLength: 4096,
    maxCaptionLength: 1024,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreviewService,
        {
          provide: AppConfigService,
          useValue: {
            getChannel: jest.fn(),
          },
        },
        {
          provide: ConverterService,
          useValue: {
            convert: jest.fn((content: string) => content),
            sanitizeHtml: jest.fn((content: string) => content),
          },
        },
        {
          provide: TelegramTypeDetector,
          useValue: {
            detectType: jest.fn().mockReturnValue(PostType.POST),
          },
        },
        {
          provide: MediaService,
          useValue: {
            validateMediaUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PreviewService>(PreviewService);
    appConfigService = module.get<AppConfigService>(AppConfigService);
    converterService = module.get<ConverterService>(ConverterService);
    telegramTypeDetector = module.get<TelegramTypeDetector>(TelegramTypeDetector);
    mediaService = module.get<MediaService>(MediaService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('preview - validation', () => {
    it('should return error when platform is missing', async () => {
      const request = {
        body: 'Test message',
        channel: 'test-channel',
      } as PostRequestDto;

      const result = await service.preview(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.data.valid).toBe(false);
        expect(result.data.errors).toContain("Field 'platform' is required");
      }
    });

    it('should return error when platform is not supported', async () => {
      const request: PostRequestDto = {
        platform: 'unsupported',
        body: 'Test message',
        channel: 'test-channel',
      };

      const result = await service.preview(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.data.errors).toContain("Platform 'unsupported' is not supported");
      }
    });

    it('should return error when neither channel nor auth is provided', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
      };

      const result = await service.preview(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.data.errors).toContain("Either 'channel' or 'auth' must be provided");
      }
    });

    it('should return error when channel is not found', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        channel: 'non-existent',
      };

      (appConfigService.getChannel as jest.Mock).mockImplementation(() => {
        throw new Error('Channel not found');
      });

      const result = await service.preview(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.data.errors).toContain("Channel 'non-existent' not found in configuration");
      }
    });

    it('should return error when channel provider does not match platform', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        channel: 'vk-channel',
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue({
        provider: 'vk',
        enabled: true,
      });

      const result = await service.preview(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.data.errors).toContain(
          "Channel provider 'vk' does not match requested platform 'telegram'",
        );
      }
    });
  });

  describe('preview - ambiguous media validation', () => {
    it('should return error for ambiguous media fields', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        channel: 'test-channel',
        cover: 'https://example.com/image.jpg',
        video: 'https://example.com/video.mp4',
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);

      const result = await service.preview(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.data.errors.some(e => e.includes('Ambiguous media fields'))).toBe(true);
      }
    });

    it('should not return error when media[] is provided with other fields', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        channel: 'test-channel',
        media: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
        cover: 'https://example.com/image.jpg',
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);
      (telegramTypeDetector.detectType as jest.Mock).mockReturnValue(PostType.ALBUM);

      const result = await service.preview(request);

      expect(result.success).toBe(true);
    });
  });

  describe('preview - type detection and validation', () => {
    it('should detect type using TelegramTypeDetector', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        channel: 'test-channel',
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);
      (telegramTypeDetector.detectType as jest.Mock).mockReturnValue(PostType.POST);

      const result = await service.preview(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.detectedType).toBe(PostType.POST);
      }
      expect(telegramTypeDetector.detectType).toHaveBeenCalledWith(request);
    });

    it('should return error when cover is missing for image type', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        channel: 'test-channel',
        type: PostType.IMAGE,
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);
      (telegramTypeDetector.detectType as jest.Mock).mockReturnValue(PostType.IMAGE);

      const result = await service.preview(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.data.errors).toContain("Field 'cover' is required for type 'image'");
      }
    });

    it('should return error when video is missing for video type', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        channel: 'test-channel',
        type: PostType.VIDEO,
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);
      (telegramTypeDetector.detectType as jest.Mock).mockReturnValue(PostType.VIDEO);

      const result = await service.preview(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.data.errors).toContain("Field 'video' is required for type 'video'");
      }
    });

    it('should return error when media is missing for album type', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        channel: 'test-channel',
        type: PostType.ALBUM,
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);
      (telegramTypeDetector.detectType as jest.Mock).mockReturnValue(PostType.ALBUM);

      const result = await service.preview(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.data.errors).toContain("Field 'media' is required for type 'album'");
      }
    });
  });

  describe('preview - media URL validation', () => {
    it('should validate media URLs', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        channel: 'test-channel',
        cover: 'https://example.com/image.jpg',
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);
      (telegramTypeDetector.detectType as jest.Mock).mockReturnValue(PostType.IMAGE);

      await service.preview(request);

      expect(mediaService.validateMediaUrl).toHaveBeenCalledWith('https://example.com/image.jpg');
    });

    it('should return error for invalid media URL', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        channel: 'test-channel',
        cover: 'invalid-url',
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);
      (telegramTypeDetector.detectType as jest.Mock).mockReturnValue(PostType.IMAGE);
      (mediaService.validateMediaUrl as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid URL format');
      });

      const result = await service.preview(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.data.errors.some(e => e.includes('Invalid cover URL'))).toBe(true);
      }
    });
  });

  describe('preview - body conversion', () => {
    it('should convert body from markdown to HTML', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: '**bold** text',
        bodyFormat: BodyFormat.MARKDOWN,
        channel: 'test-channel',
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);
      (converterService.convert as jest.Mock).mockReturnValue('<b>bold</b> text');

      const result = await service.preview(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.convertedBody).toBe('<b>bold</b> text');
        expect(result.data.targetFormat).toBe(BodyFormat.HTML);
      }
      expect(converterService.convert).toHaveBeenCalledWith(
        '**bold** text',
        BodyFormat.MARKDOWN,
        BodyFormat.HTML,
      );
    });

    it('should not convert body when convertBody is false', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: '**bold** text',
        bodyFormat: BodyFormat.MARKDOWN,
        convertBody: false,
        channel: 'test-channel',
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);

      const result = await service.preview(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.convertedBody).toBe('**bold** text');
      }
      expect(converterService.convert).not.toHaveBeenCalled();
    });

    it('should sanitize HTML output', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: '<script>alert("xss")</script><b>text</b>',
        bodyFormat: BodyFormat.HTML,
        channel: 'test-channel',
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);
      (converterService.sanitizeHtml as jest.Mock).mockReturnValue('<b>text</b>');

      const result = await service.preview(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.convertedBody).toBe('<b>text</b>');
      }
      expect(converterService.sanitizeHtml).toHaveBeenCalled();
    });
  });

  describe('preview - warnings', () => {
    it('should warn about ignored Telegram fields', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        channel: 'test-channel',
        title: 'Some title',
        description: 'Some description',
        tags: ['tag1', 'tag2'],
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);

      const result = await service.preview(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.warnings.some(w => w.includes('title') && w.includes('ignored'))).toBe(
          true,
        );
      }
    });

    it('should warn about ignored media fields for specific type', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        channel: 'test-channel',
        cover: 'https://example.com/image.jpg',
        video: 'https://example.com/video.mp4',
        type: PostType.IMAGE,
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);
      (telegramTypeDetector.detectType as jest.Mock).mockReturnValue(PostType.IMAGE);

      const result = await service.preview(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.warnings.some(w => w.includes('video'))).toBe(true);
      }
    });

    it('should warn when body exceeds platform limit', async () => {
      const longBody = 'a'.repeat(5000);
      const request: PostRequestDto = {
        platform: 'telegram',
        body: longBody,
        channel: 'test-channel',
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);
      (converterService.convert as jest.Mock).mockReturnValue(longBody);
      (converterService.sanitizeHtml as jest.Mock).mockReturnValue(longBody);

      const result = await service.preview(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.warnings.some(w => w.includes('exceeds platform limit'))).toBe(true);
      }
    });

    it('should use caption limit for media types', async () => {
      const longCaption = 'a'.repeat(1500);
      const request: PostRequestDto = {
        platform: 'telegram',
        body: longCaption,
        channel: 'test-channel',
        cover: 'https://example.com/image.jpg',
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);
      (telegramTypeDetector.detectType as jest.Mock).mockReturnValue(PostType.IMAGE);
      (converterService.convert as jest.Mock).mockReturnValue(longCaption);
      (converterService.sanitizeHtml as jest.Mock).mockReturnValue(longCaption);

      const result = await service.preview(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.warnings.some(w => w.includes('1024'))).toBe(true);
      }
    });
  });

  describe('preview - success response', () => {
    it('should return valid preview response with all fields', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        channel: 'test-channel',
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);
      (converterService.sanitizeHtml as jest.Mock).mockReturnValue('Test message');

      const result = await service.preview(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          valid: true,
          detectedType: PostType.POST,
          convertedBody: 'Test message',
          targetFormat: BodyFormat.HTML,
          convertedBodyLength: 12,
          warnings: [],
        });
      }
    });

    it('should work with inline auth', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        auth: {
          botToken: 'test-token',
          chatId: '@test_channel',
        },
      };

      const result = await service.preview(request);

      expect(result.success).toBe(true);
      expect(appConfigService.getChannel).not.toHaveBeenCalled();
    });

    it('should calculate convertedBodyLength correctly', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Hello 🌍',
        channel: 'test-channel',
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);
      (converterService.sanitizeHtml as jest.Mock).mockReturnValue('Hello 🌍');

      const result = await service.preview(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.convertedBodyLength).toBe('Hello 🌍'.length);
      }
    });
  });
});
