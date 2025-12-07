import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException, Logger } from '@nestjs/common';
import { PreviewService } from '@/modules/post/preview.service.js';
import { AppConfigService } from '@/modules/app-config/app-config.service.js';
import { PlatformRegistry } from '@/modules/platforms/base/platform-registry.service.js';
import { AuthValidatorRegistry } from '@/modules/platforms/base/auth-validator-registry.service.js';
import type { PostRequestDto, PreviewResponseDto } from '@/modules/post/dto/index.js';

describe('PreviewService', () => {
  let service: PreviewService;
  let appConfigService: AppConfigService;
  let mockTelegramPlatform: any;

  const mockChannelConfig = {
    platform: 'telegram',

    auth: {
      botToken: '123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
      chatId: 'test-chat-id',
    },
    parseMode: 'HTML',
    maxTextLength: 4096,
    maxCaptionLength: 1024,
  };

  beforeEach(async () => {
    mockTelegramPlatform = {
      name: 'telegram',
      supportedTypes: [],
      preview: jest.fn(),
    };

    const mockPlatformRegistry = {
      get: jest.fn().mockImplementation((platform: string) => {
        if (platform.toLowerCase() === 'telegram') {
          return mockTelegramPlatform;
        }
        throw new BadRequestException(`Platform "${platform}" is not supported`);
      }),
      has: jest
        .fn()
        .mockImplementation((platform: string) => platform.toLowerCase() === 'telegram'),
    };

    const mockAuthValidatorRegistry = {
      validate: jest.fn(),
    };

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
          provide: PlatformRegistry,
          useValue: mockPlatformRegistry,
        },
        {
          provide: AuthValidatorRegistry,
          useValue: mockAuthValidatorRegistry,
        },
      ],
    }).compile();

    service = module.get<PreviewService>(PreviewService);
    appConfigService = module.get<AppConfigService>(AppConfigService);

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
        expect(result.data.errors).toContain('Platform "unsupported" is not supported');
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
        expect(result.data.errors).toContain('Either "channel" or "auth" must be provided');
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
        expect(result.data.errors).toContain('Channel not found');
      }
    });

    it('should return error when channel platform does not match platform', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        channel: 'vk-channel',
      };

      (appConfigService.getChannel as jest.Mock).mockReturnValue({
        platform: 'vk',

        auth: { botToken: '123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11', chatId: 'test' },
      });

      const result = await service.preview(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.data.errors).toContain(
          'Channel platform "vk" does not match requested platform "telegram"',
        );
      }
    });
  });

  describe('preview - platform delegation', () => {
    it('should delegate to TelegramPlatform with channel config', async () => {
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
      (mockTelegramPlatform.preview as jest.Mock).mockResolvedValue(previewResult);

      const result = await service.preview(request);

      expect(appConfigService.getChannel).toHaveBeenCalledWith('test-channel');
      expect(mockTelegramPlatform.preview).toHaveBeenCalledWith(request, {
        ...mockChannelConfig,
        source: 'channel',
      });
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

      (mockTelegramPlatform.preview as jest.Mock).mockResolvedValue(previewResult);

      const result = await service.preview(request);

      expect(appConfigService.getChannel).not.toHaveBeenCalled();
      expect(mockTelegramPlatform.preview).toHaveBeenCalledWith(request, {
        platform: 'telegram',

        auth: request.auth,
        source: 'inline',
      });
      expect(result).toBe(previewResult);
    });
  });
});
