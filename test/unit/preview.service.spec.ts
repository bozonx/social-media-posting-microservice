import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PreviewService } from '@/modules/post/preview.service.js';
import { AppConfigService } from '@/modules/app-config/app-config.service.js';
import { TelegramProvider } from '@/modules/providers/telegram/telegram.provider.js';
import type { PostRequestDto, PreviewResponseDto } from '@/modules/post/dto/index.js';

describe('PreviewService', () => {
  let service: PreviewService;
  let appConfigService: AppConfigService;
  let telegramProvider: TelegramProvider;

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
          provide: TelegramProvider,
          useValue: {
            name: 'telegram',
            supportedTypes: [],
            preview: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PreviewService>(PreviewService);
    appConfigService = module.get<AppConfigService>(AppConfigService);
    telegramProvider = module.get<TelegramProvider>(TelegramProvider);

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
        expect(result.data.errors).toContain('Provider "unsupported" is not supported');
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

  describe('preview - provider delegation', () => {
    it('should delegate to TelegramProvider with channel config', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        channel: 'test-channel',
      };

      const previewResult: PreviewResponseDto = {
        success: true,
        data: {
          valid: true,
          detectedType: undefined as any,
          convertedBody: 'Test message',
          targetFormat: 'html' as any,
          convertedBodyLength: 12,
          warnings: [],
        },
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue(mockChannelConfig);
      (telegramProvider.preview as jest.Mock).mockResolvedValue(previewResult);

      const result = await service.preview(request);

      expect(appConfigService.getChannel).toHaveBeenCalledWith('test-channel');
      expect(telegramProvider.preview).toHaveBeenCalledWith(request, mockChannelConfig);
      expect(result).toBe(previewResult);
    });

    it('should build inline channel config when auth is provided', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        auth: {
          botToken: 'test-token',
          chatId: '@test_channel',
        },
      };

      const previewResult: PreviewResponseDto = {
        success: true,
        data: {
          valid: true,
          detectedType: undefined as any,
          convertedBody: 'Test message',
          targetFormat: 'html' as any,
          convertedBodyLength: 12,
          warnings: [],
        },
      };

      (telegramProvider.preview as jest.Mock).mockResolvedValue(previewResult);

      const result = await service.preview(request);

      expect(appConfigService.getChannel).not.toHaveBeenCalled();
      expect(telegramProvider.preview).toHaveBeenCalledWith(request, {
        provider: 'telegram',
        enabled: true,
        auth: request.auth,
      });
      expect(result).toBe(previewResult);
    });
  });
});
