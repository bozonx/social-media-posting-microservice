import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { PostRequestDto } from '@/modules/post/dto/index.js';
import { PostType, BodyFormat } from '@/common/enums/index.js';

// Create mock API before mocking grammy
const mockApi = {
  sendMessage: jest.fn(),
  sendPhoto: jest.fn(),
  sendVideo: jest.fn(),
  sendAudio: jest.fn(),
  sendMediaGroup: jest.fn(),
  sendDocument: jest.fn(),
};

// Mock grammy before importing modules that use it
jest.unstable_mockModule('grammy', () => ({
  Bot: jest.fn().mockImplementation(() => ({
    api: mockApi,
  })),
  InputFile: jest.fn(),
}));

// Dynamic imports after mocking
const { TelegramProvider } = await import('@/modules/providers/telegram/telegram.provider.js');
type TelegramChannelConfig =
  import('@/modules/providers/telegram/telegram.provider.js').TelegramChannelConfig;
const { ConverterService } = await import('@/modules/converter/converter.service.js');
const { MediaService } = await import('@/modules/media/media.service.js');
const { TelegramTypeDetector } =
  await import('@/modules/providers/telegram/telegram-type-detector.service.js');
const { TelegramBotCache } =
  await import('@/modules/providers/telegram/telegram-bot-cache.service.js');

describe('TelegramProvider', () => {
  let provider: TelegramProvider;
  let converterService: ConverterService;
  let mediaService: MediaService;

  const mockChannelConfig: TelegramChannelConfig = {
    provider: 'telegram',
    enabled: true,
    auth: {
      botToken: 'test-token',
      chatId: 'test-chat-id',
    },
    parseMode: 'HTML' as const,
    disableNotification: false,
    convertBody: true,
    bodyFormat: 'html',
  };

  const mockBotCache = {
    getOrCreate: jest.fn().mockImplementation(() => ({
      api: mockApi,
    })),
    remove: jest.fn(),
    clear: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramProvider,
        {
          provide: ConverterService,
          useValue: {
            convert: jest.fn(content => content),
            sanitizeHtml: jest.fn(content => content),
          },
        },
        {
          provide: MediaService,
          useValue: {
            validateMediaUrl: jest.fn(),
            validateMediaUrls: jest.fn(),
          },
        },
        {
          provide: TelegramTypeDetector,
          useValue: {
            detectType: jest.fn((request: PostRequestDto) => request.type ?? PostType.POST),
          },
        },
        {
          provide: TelegramBotCache,
          useValue: mockBotCache,
        },
      ],
    }).compile();

    provider = module.get<TelegramProvider>(TelegramProvider);
    converterService = module.get<ConverterService>(ConverterService);
    mediaService = module.get<MediaService>(MediaService);

    // Reset mocks before each test
    jest.clearAllMocks();

    // Suppress logs
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('provider metadata', () => {
    it('should have correct name', () => {
      expect(provider.name).toBe('telegram');
    });

    it('should support correct post types', () => {
      expect(provider.supportedTypes).toEqual([
        PostType.AUTO,
        PostType.POST,
        PostType.IMAGE,
        PostType.VIDEO,
        PostType.ALBUM,
        PostType.AUDIO,
        PostType.DOCUMENT,
      ]);
    });
  });

  describe('publish - POST type', () => {
    it('should publish text message successfully', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        type: PostType.POST,
      };

      mockApi.sendMessage.mockResolvedValue({
        message_id: 12345,
        chat: { id: 'test-chat-id' },
      });

      const result = await provider.publish(request, mockChannelConfig);

      expect(result).toEqual({
        postId: '12345',
        url: undefined,
        raw: expect.any(Object),
      });

      expect(mockApi.sendMessage).toHaveBeenCalledWith('test-chat-id', 'Test message', {
        parse_mode: 'HTML',
        disable_notification: false,
      });
    });

    it('should allow long text messages and delegate length validation to Telegram', async () => {
      const longBody = 'a'.repeat(5000);
      const request: PostRequestDto = {
        platform: 'telegram',
        body: longBody,
        type: PostType.POST,
      };

      mockApi.sendMessage.mockResolvedValue({ message_id: 12345 });

      const result = await provider.publish(request, mockChannelConfig);

      expect(result.postId).toBe('12345');
      expect(mockApi.sendMessage).toHaveBeenCalledWith(
        'test-chat-id',
        longBody,
        expect.objectContaining({ parse_mode: 'HTML' }),
      );
    });

    it('should convert body format when requested', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: '# Markdown header',
        bodyFormat: BodyFormat.MARKDOWN,
        type: PostType.POST,
      };

      mockApi.sendMessage.mockResolvedValue({ message_id: 12345 });

      (converterService.convert as jest.Mock).mockReturnValue('<h1>Markdown header</h1>');

      await provider.publish(request, mockChannelConfig);

      expect(converterService.convert).toHaveBeenCalledWith(
        '# Markdown header',
        BodyFormat.MARKDOWN,
        BodyFormat.HTML,
      );
      expect(converterService.sanitizeHtml).toHaveBeenCalled();
    });

    it('should not convert body when convertBody is false', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        convertBody: false,
        type: PostType.POST,
      };

      mockApi.sendMessage.mockResolvedValue({ message_id: 12345 });

      await provider.publish(request, mockChannelConfig);

      expect(converterService.convert).not.toHaveBeenCalled();
    });

    it('should use platform-specific parameters', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        type: PostType.POST,
        options: {
          parse_mode: 'Markdown',
          disable_notification: true,
          link_preview_options: { is_disabled: true },
          reply_to_message_id: 999,
          protect_content: true,
          reply_markup: {
            inline_keyboard: [[{ text: 'Button', url: 'https://example.com' }]],
          },
        },
      };

      mockApi.sendMessage.mockResolvedValue({ message_id: 12345 });

      await provider.publish(request, mockChannelConfig);

      expect(mockApi.sendMessage).toHaveBeenCalledWith('test-chat-id', 'Test message', {
        parse_mode: 'HTML', // from channel config
        disable_notification: false, // from channel config
        // All options from request.options are spread here
        ...request.options,
      });
    });

    it('should build URL for public channels', async () => {
      const publicChannelConfig: TelegramChannelConfig = {
        provider: 'telegram',
        enabled: true,
        auth: {
          botToken: 'test-token',
          chatId: '@publicchannel',
        },
      };

      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        type: PostType.POST,
      };

      mockApi.sendMessage.mockResolvedValue({ message_id: 12345 });

      const result = await provider.publish(request, publicChannelConfig);

      expect(result.url).toBe('https://t.me/publicchannel/12345');
    });
  });

  describe('publish - IMAGE type', () => {
    it('should publish image with caption', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Image caption',
        cover: 'https://example.com/image.jpg',
        type: PostType.IMAGE,
      };

      mockApi.sendPhoto.mockResolvedValue({ message_id: 12345 });

      const result = await provider.publish(request, mockChannelConfig);

      expect(result.postId).toBe('12345');
      expect(mediaService.validateMediaUrl).toHaveBeenCalledWith('https://example.com/image.jpg');
      expect(mockApi.sendPhoto).toHaveBeenCalledWith(
        'test-chat-id',
        'https://example.com/image.jpg',
        expect.objectContaining({
          caption: 'Image caption',
          parse_mode: 'HTML',
          disable_notification: false,
          has_spoiler: false,
        }),
      );
    });

    it('should throw error if cover is missing for IMAGE type', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Image caption',
        type: PostType.IMAGE,
      };

      await expect(provider.publish(request, mockChannelConfig)).rejects.toThrow(
        "Field 'cover' is required for type 'image'",
      );
    });
  });

  describe('publish - VIDEO type', () => {
    it('should publish video with caption', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Video caption',
        video: 'https://example.com/video.mp4',
        type: PostType.VIDEO,
      };

      mockApi.sendVideo.mockResolvedValue({ message_id: 12345 });

      const result = await provider.publish(request, mockChannelConfig);

      expect(result.postId).toBe('12345');
      expect(mediaService.validateMediaUrl).toHaveBeenCalledWith('https://example.com/video.mp4');
      expect(mockApi.sendVideo).toHaveBeenCalledWith(
        'test-chat-id',
        'https://example.com/video.mp4',
        expect.objectContaining({
          caption: 'Video caption',
          parse_mode: 'HTML',
          disable_notification: false,
          has_spoiler: false,
        }),
      );
    });

    it('should throw error if video is missing for VIDEO type', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Video caption',
        type: PostType.VIDEO,
      };

      await expect(provider.publish(request, mockChannelConfig)).rejects.toThrow(
        "Field 'video' is required for type 'video'",
      );
    });
  });

  describe('publish - ALBUM type', () => {
    it('should publish album with media group', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Album caption',
        media: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
          'https://example.com/video.mp4',
        ],
        type: PostType.ALBUM,
      };

      mockApi.sendMediaGroup.mockResolvedValue([
        { message_id: 12345 },
        { message_id: 12346 },
        { message_id: 12347 },
      ]);

      const result = await provider.publish(request, mockChannelConfig);

      expect(result.postId).toBe('12345');
      expect(mediaService.validateMediaUrl).toHaveBeenCalledTimes(3);
      expect(mediaService.validateMediaUrl).toHaveBeenCalledWith('https://example.com/image1.jpg');
      expect(mediaService.validateMediaUrl).toHaveBeenCalledWith('https://example.com/image2.jpg');
      expect(mediaService.validateMediaUrl).toHaveBeenCalledWith('https://example.com/video.mp4');
      expect(mockApi.sendMediaGroup).toHaveBeenCalledWith(
        'test-chat-id',
        [
          {
            type: 'photo',
            media: 'https://example.com/image1.jpg',
            caption: 'Album caption',
            parse_mode: 'HTML',
            has_spoiler: false,
          },
          {
            type: 'photo',
            media: 'https://example.com/image2.jpg',
            caption: undefined,
            parse_mode: undefined,
            has_spoiler: false,
          },
          {
            type: 'video',
            media: 'https://example.com/video.mp4',
            caption: undefined,
            parse_mode: undefined,
            has_spoiler: false,
          },
        ],
        { disable_notification: false },
      );
    });

    it('should throw error if media array is empty for ALBUM type', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Album caption',
        media: [],
        type: PostType.ALBUM,
      };

      await expect(provider.publish(request, mockChannelConfig)).rejects.toThrow(
        "Field 'media' is required for type 'album'",
      );
    });
  });

  describe('publish - DOCUMENT type', () => {
    it('should publish document with caption', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Document caption',
        document: 'https://example.com/document.pdf',
        type: PostType.DOCUMENT,
      };

      mockApi.sendDocument.mockResolvedValue({ message_id: 12345 });

      const result = await provider.publish(request, mockChannelConfig);

      expect(result.postId).toBe('12345');
      expect(mediaService.validateMediaUrl).toHaveBeenCalledWith(
        'https://example.com/document.pdf',
      );
      expect(mockApi.sendDocument).toHaveBeenCalledWith(
        'test-chat-id',
        'https://example.com/document.pdf',
        expect.objectContaining({
          caption: 'Document caption',
          parse_mode: 'HTML',
          disable_notification: false,
        }),
      );
    });

    it('should throw error if no document URL is provided', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Document caption',
        type: PostType.DOCUMENT,
      };

      await expect(provider.publish(request, mockChannelConfig)).rejects.toThrow(
        "Field 'document' is required for type 'document'",
      );
    });
  });

  describe('publish - AUDIO type', () => {
    it('should publish audio with caption', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Audio caption',
        audio: 'https://example.com/audio.mp3',
        type: PostType.AUDIO,
      };

      mockApi.sendAudio.mockResolvedValue({ message_id: 12345 });

      const result = await provider.publish(request, mockChannelConfig);

      expect(result.postId).toBe('12345');
      expect(mediaService.validateMediaUrl).toHaveBeenCalledWith('https://example.com/audio.mp3');
      expect(mockApi.sendAudio).toHaveBeenCalledWith(
        'test-chat-id',
        'https://example.com/audio.mp3',
        expect.objectContaining({
          caption: 'Audio caption',
          parse_mode: 'HTML',
          disable_notification: false,
        }),
      );
    });

    it('should throw error if audio is missing for AUDIO type', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Audio caption',
        type: PostType.AUDIO,
      };

      await expect(provider.publish(request, mockChannelConfig)).rejects.toThrow(
        "Field 'audio' is required for type 'audio'",
      );
    });
  });

  describe('publish - MediaInput object support', () => {
    it('should use fileId when provided instead of URL', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Image caption',
        cover: { fileId: 'AgACAgIAAxkBAAIC...' },
        type: PostType.IMAGE,
      };

      mockApi.sendPhoto.mockResolvedValue({ message_id: 12345 });

      await provider.publish(request, mockChannelConfig);

      expect(mockApi.sendPhoto).toHaveBeenCalledWith(
        'test-chat-id',
        'AgACAgIAAxkBAAIC...',
        expect.any(Object),
      );
      // Should not validate URL when using fileId
      expect(mediaService.validateMediaUrl).not.toHaveBeenCalled();
    });

    it('should send photo with hasSpoiler flag', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Spoiler image',
        cover: { url: 'https://example.com/image.jpg', hasSpoiler: true },
        type: PostType.IMAGE,
      };

      mockApi.sendPhoto.mockResolvedValue({ message_id: 12345 });

      await provider.publish(request, mockChannelConfig);

      expect(mockApi.sendPhoto).toHaveBeenCalledWith(
        'test-chat-id',
        'https://example.com/image.jpg',
        expect.objectContaining({
          has_spoiler: true,
        }),
      );
    });

    it('should send video with hasSpoiler flag', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Spoiler video',
        video: { url: 'https://example.com/video.mp4', hasSpoiler: true },
        type: PostType.VIDEO,
      };

      mockApi.sendVideo.mockResolvedValue({ message_id: 12345 });

      await provider.publish(request, mockChannelConfig);

      expect(mockApi.sendVideo).toHaveBeenCalledWith(
        'test-chat-id',
        'https://example.com/video.mp4',
        expect.objectContaining({
          has_spoiler: true,
        }),
      );
    });

    it('should prefer fileId over URL when both are provided', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Document caption',
        document: { url: 'https://example.com/doc.pdf', fileId: 'BQACAgIAAxkBAAIC...' },
        type: PostType.DOCUMENT,
      };

      mockApi.sendDocument.mockResolvedValue({ message_id: 12345 });

      await provider.publish(request, mockChannelConfig);

      expect(mockApi.sendDocument).toHaveBeenCalledWith(
        'test-chat-id',
        'BQACAgIAAxkBAAIC...',
        expect.any(Object),
      );
    });
  });

  describe('publish - validation errors', () => {
    it('should throw error for POST type with media fields', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        cover: 'https://example.com/image.jpg',
        type: PostType.POST,
      };

      await expect(provider.publish(request, mockChannelConfig)).rejects.toThrow(
        "For type 'post', media fields must not be provided",
      );
    });

    it('should throw error for unsupported post type', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        type: PostType.ARTICLE,
      };

      await expect(provider.publish(request, mockChannelConfig)).rejects.toThrow(
        "Post type 'article' is not supported for Telegram",
      );
    });
  });

  describe('getTargetBodyFormat', () => {
    it('should return HTML for HTML parse mode', () => {
      const format = (provider as any).getTargetBodyFormat('HTML');
      expect(format).toBe(BodyFormat.HTML);
    });

    it('should return MARKDOWN for Markdown parse mode', () => {
      const format = (provider as any).getTargetBodyFormat('Markdown');
      expect(format).toBe(BodyFormat.MARKDOWN);
    });

    it('should return MARKDOWN for MarkdownV2 parse mode', () => {
      const format = (provider as any).getTargetBodyFormat('MarkdownV2');
      expect(format).toBe(BodyFormat.MARKDOWN);
    });

    it('should return TEXT by default', () => {
      const format = (provider as any).getTargetBodyFormat(undefined);
      expect(format).toBe(BodyFormat.TEXT);
    });
  });

  describe('buildPostUrl', () => {
    it('should build URL for public channels', () => {
      const url = (provider as any).buildPostUrl('@publicchannel', 12345);
      expect(url).toBe('https://t.me/publicchannel/12345');
    });

    it('should return undefined for private chats', () => {
      const url = (provider as any).buildPostUrl('123456789', 12345);
      expect(url).toBeUndefined();
    });

    it('should return undefined for negative chat IDs', () => {
      const url = (provider as any).buildPostUrl('-100123456789', 12345);
      expect(url).toBeUndefined();
    });

    it('should handle numeric chatId', () => {
      const url = (provider as any).buildPostUrl(123456789, 12345);
      expect(url).toBeUndefined();
    });

    it('should handle numeric chatId for public channels', () => {
      // This is an edge case - numeric chatId won't start with '@'
      // but we ensure it doesn't throw an error
      const url = (provider as any).buildPostUrl(456361709, 12345);
      expect(url).toBeUndefined();
    });
  });

  describe('preview', () => {
    it('should return invalid preview result when validation fails', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
        type: PostType.ARTICLE,
      };

      const result = await provider.preview(request, mockChannelConfig as any);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.data.valid).toBe(false);
        expect(result.data.errors).toContain("Post type 'article' is not supported for Telegram");
        expect(Array.isArray(result.data.warnings)).toBe(true);
      }
    });

    it('should return valid preview result and include length warning when body exceeds limit', async () => {
      const longBody = 'x'.repeat(50);
      const request: PostRequestDto = {
        platform: 'telegram',
        body: longBody,
        type: PostType.POST,
      };

      const channelConfigWithLimit: TelegramChannelConfig = {
        ...mockChannelConfig,
        maxTextLength: 10,
      };

      const result = await provider.preview(request, channelConfigWithLimit);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.valid).toBe(true);
        expect(result.data.detectedType).toBe(PostType.POST);
        expect(result.data.convertedBody).toBe(longBody);
        expect(result.data.convertedBodyLength).toBe(longBody.length);
        expect(result.data.warnings).toContain('Body length (50) exceeds platform limit (10)');
      }
    });
  });
});
