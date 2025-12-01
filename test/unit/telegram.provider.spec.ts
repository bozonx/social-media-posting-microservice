import { Test, type TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { TelegramProvider } from '@/modules/providers/telegram/telegram.provider';
import { ConverterService } from '@/modules/converter/converter.service';
import { MediaService } from '@/modules/media/media.service';
import type { PostRequestDto } from '@/modules/post/dto';
import { PostType, BodyFormat } from '@/common/enums';
import { Bot } from 'grammy';

const mockApi = {
  sendMessage: jest.fn(),
  sendPhoto: jest.fn(),
  sendVideo: jest.fn(),
  sendMediaGroup: jest.fn(),
  sendDocument: jest.fn(),
};

// Мокируем grammy
jest.mock('grammy', () => {
  return {
    Bot: jest.fn().mockImplementation(() => ({
      api: mockApi,
    })),
    InputFile: jest.fn(),
  };
});

describe('TelegramProvider', () => {
  let provider: TelegramProvider;
  let converterService: ConverterService;
  let mediaService: MediaService;

  const mockChannelConfig = {
    auth: {
      botToken: 'test-token',
      chatId: 'test-chat-id',
    },
    parseMode: 'HTML' as const,
    disableNotification: false,
    convertBody: true,
    bodyFormat: 'html',
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
      ],
    }).compile();

    provider = module.get<TelegramProvider>(TelegramProvider);
    converterService = module.get<ConverterService>(ConverterService);
    mediaService = module.get<MediaService>(MediaService);

    // Сбрасываем моки перед каждым тестом
    jest.clearAllMocks();

    // Подавляем логи
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
        PostType.POST,
        PostType.IMAGE,
        PostType.VIDEO,
        PostType.ALBUM,
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
        reply_markup: undefined,
        link_preview_options: undefined,
        reply_to_message_id: undefined,
        protect_content: undefined,
      });
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
        platformData: {
          parseMode: 'Markdown',
          disableNotification: true,
          disableWebPagePreview: true,
          replyToMessageId: 999,
          protectContent: true,
          inlineKeyboard: [[{ text: 'Button', url: 'https://example.com' }]],
        },
      };

      mockApi.sendMessage.mockResolvedValue({ message_id: 12345 });

      await provider.publish(request, mockChannelConfig);

      expect(mockApi.sendMessage).toHaveBeenCalledWith('test-chat-id', 'Test message', {
        parse_mode: 'Markdown',
        disable_notification: true,
        link_preview_options: { is_disabled: true },
        reply_to_message_id: 999,
        protect_content: true,
        reply_markup: {
          inline_keyboard: [[{ text: 'Button', url: 'https://example.com' }]],
        },
      });
    });

    it('should build URL for public channels', async () => {
      const publicChannelConfig = {
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
        {
          caption: 'Image caption',
          parse_mode: 'HTML',
          disable_notification: false,
          reply_markup: undefined,
        },
      );
    });

    it('should throw error if cover is missing for IMAGE type', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Image caption',
        type: PostType.IMAGE,
      };

      await expect(provider.publish(request, mockChannelConfig)).rejects.toThrow(
        'Cover image is required for IMAGE type',
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
        {
          caption: 'Video caption',
          parse_mode: 'HTML',
          disable_notification: false,
        },
      );
    });

    it('should throw error if video is missing for VIDEO type', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Video caption',
        type: PostType.VIDEO,
      };

      await expect(provider.publish(request, mockChannelConfig)).rejects.toThrow(
        'Video URL is required for VIDEO type',
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
      expect(mediaService.validateMediaUrls).toHaveBeenCalledWith(request.media);
      expect(mockApi.sendMediaGroup).toHaveBeenCalledWith(
        'test-chat-id',
        [
          {
            type: 'photo',
            media: 'https://example.com/image1.jpg',
            caption: 'Album caption',
            parse_mode: 'HTML',
          },
          {
            type: 'photo',
            media: 'https://example.com/image2.jpg',
            caption: undefined,
            parse_mode: undefined,
          },
          {
            type: 'video',
            media: 'https://example.com/video.mp4',
            caption: undefined,
            parse_mode: undefined,
          },
        ],
        { disable_notification: false },
      );
    });

    it('should limit album to 10 items', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Album caption',
        media: Array(15).fill('https://example.com/image.jpg'),
        type: PostType.ALBUM,
      };

      mockApi.sendMediaGroup.mockResolvedValue(
        Array(10)
          .fill(null)
          .map((_, i) => ({ message_id: 12345 + i })),
      );

      await provider.publish(request, mockChannelConfig);

      const callArgs = mockApi.sendMediaGroup.mock.calls[0];
      expect(callArgs[1]).toHaveLength(10);
    });

    it('should throw error if media array is empty for ALBUM type', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Album caption',
        media: [],
        type: PostType.ALBUM,
      };

      await expect(provider.publish(request, mockChannelConfig)).rejects.toThrow(
        'Media array is required for ALBUM type',
      );
    });
  });

  describe('publish - DOCUMENT type', () => {
    it('should publish document from media array', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Document caption',
        media: ['https://example.com/document.pdf'],
        type: PostType.DOCUMENT,
      };

      mockApi.sendDocument.mockResolvedValue({ message_id: 12345 });

      await provider.publish(request, mockChannelConfig);

      expect(mockApi.sendDocument).toHaveBeenCalledWith(
        'test-chat-id',
        'https://example.com/document.pdf',
        {
          caption: 'Document caption',
          parse_mode: 'HTML',
          disable_notification: false,
        },
      );
    });

    it('should publish document from cover if media is empty', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Document caption',
        cover: 'https://example.com/document.pdf',
        type: PostType.DOCUMENT,
      };

      mockApi.sendDocument.mockResolvedValue({ message_id: 12345 });

      await provider.publish(request, mockChannelConfig);

      expect(mockApi.sendDocument).toHaveBeenCalledWith(
        'test-chat-id',
        'https://example.com/document.pdf',
        expect.any(Object),
      );
    });

    it('should throw error if no document URL is provided', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Document caption',
        type: PostType.DOCUMENT,
      };

      await expect(provider.publish(request, mockChannelConfig)).rejects.toThrow(
        'Document URL is required for DOCUMENT type',
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

    it('should return HTML by default', () => {
      const format = (provider as any).getTargetBodyFormat(undefined);
      expect(format).toBe(BodyFormat.HTML);
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
  });
});
