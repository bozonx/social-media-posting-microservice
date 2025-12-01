import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Bot, InputFile } from 'grammy';
import { IProvider } from '../base/provider.interface';
import { PostType, BodyFormat } from '../../../common/enums';
import { PostRequestDto } from '../../post/dto';
import { ConverterService } from '../../converter/converter.service';
import { MediaService } from '../../media/media.service';
import { MediaInputHelper } from '../../../common/helpers/media-input.helper';
import { AmbiguousMediaValidator } from '../../../common/validators/ambiguous-media.validator';
import { TelegramTypeDetector } from './telegram-type-detector.service';

interface TelegramChannelConfig {
  auth: {
    botToken: string;
    chatId: string;
  };
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableNotification?: boolean;
  convertBody?: boolean;
  bodyFormat?: string;
  maxTextLength?: number;
  maxCaptionLength?: number;
}

@Injectable()
export class TelegramProvider implements IProvider {
  readonly name = 'telegram';
  readonly supportedTypes = [
    PostType.AUTO,
    PostType.POST,
    PostType.IMAGE,
    PostType.VIDEO,
    PostType.ALBUM,
    PostType.AUDIO,
    PostType.DOCUMENT,
  ];

  private readonly logger = new Logger(TelegramProvider.name);

  constructor(
    private readonly converterService: ConverterService,
    private readonly mediaService: MediaService,
    private readonly typeDetector: TelegramTypeDetector,
  ) {}

  async publish(request: PostRequestDto, channelConfig: TelegramChannelConfig) {
    const { botToken, chatId } = channelConfig.auth;
    const bot = new Bot(botToken);

    // Validate ambiguous media fields
    AmbiguousMediaValidator.validate(request);

    // Detect actual type
    const actualType = this.typeDetector.detectType(request);

    // Validate type is supported
    if (!this.supportedTypes.includes(actualType)) {
      throw new BadRequestException(`Post type '${actualType}' is not supported for Telegram`);
    }

    // Validate required fields for explicit types
    this.validateRequiredFields(request, actualType);

    // Log ignored fields
    this.logIgnoredFields(request);

    // Validate media URLs (only for URLs, not file_ids)
    this.validateMediaUrls(request);

    // Convert body
    const shouldConvert = request.convertBody ?? channelConfig.convertBody ?? true;
    const targetFormat = this.getTargetBodyFormat(channelConfig.parseMode);
    const sourceFormat = request.bodyFormat || BodyFormat.TEXT;

    let processedBody = request.body;
    if (shouldConvert && sourceFormat !== targetFormat) {
      processedBody = this.converterService.convert(request.body, sourceFormat, targetFormat);
    }

    // Sanitize HTML if using HTML mode
    if (channelConfig.parseMode === 'HTML' && targetFormat === BodyFormat.HTML) {
      processedBody = this.converterService.sanitizeHtml(processedBody);
    }

    // Platform-specific parameters
    const options = request.options || {};
    const parseMode = options.parseMode || channelConfig.parseMode || 'HTML';
    const disableNotification =
      options.disableNotification ?? channelConfig.disableNotification ?? false;

    // Publish based on type
    let result: any;

    switch (actualType) {
      case PostType.POST:
        result = await this.sendMessage(
          bot,
          chatId,
          processedBody,
          parseMode,
          disableNotification,
          options,
        );
        break;

      case PostType.IMAGE:
        result = await this.sendPhoto(
          bot,
          chatId,
          request.cover!,
          processedBody,
          parseMode,
          disableNotification,
          options,
        );
        break;

      case PostType.VIDEO:
        result = await this.sendVideo(
          bot,
          chatId,
          request.video!,
          processedBody,
          parseMode,
          disableNotification,
          options,
        );
        break;

      case PostType.AUDIO:
        result = await this.sendAudio(
          bot,
          chatId,
          request.audio!,
          processedBody,
          parseMode,
          disableNotification,
          options,
        );
        break;

      case PostType.DOCUMENT:
        result = await this.sendDocument(
          bot,
          chatId,
          request.document!,
          processedBody,
          parseMode,
          disableNotification,
          options,
        );
        break;

      case PostType.ALBUM:
        result = await this.sendMediaGroup(
          bot,
          chatId,
          request.media!,
          processedBody,
          parseMode,
          disableNotification,
        );
        break;

      default:
        throw new BadRequestException(`Unsupported post type: ${actualType}`);
    }

    this.logger.log(`Published to Telegram chat ${chatId}, type: ${actualType}`);

    return {
      postId: String(result.message_id || result[0]?.message_id),
      url: this.buildPostUrl(chatId, result.message_id || result[0]?.message_id),
      raw: result,
    };
  }

  private async sendMessage(
    bot: Bot,
    chatId: string,
    text: string,
    parseMode: string,
    disableNotification: boolean,
    options: any,
  ) {
    return await bot.api.sendMessage(chatId, text, {
      parse_mode: parseMode as any,
      disable_notification: disableNotification,
      reply_markup: options.inlineKeyboard
        ? { inline_keyboard: options.inlineKeyboard }
        : undefined,
      link_preview_options: options.disableWebPagePreview ? { is_disabled: true } : undefined,
      reply_to_message_id: options.replyToMessageId,
      protect_content: options.protectContent,
    });
  }

  private async sendPhoto(
    bot: Bot,
    chatId: string,
    cover: any,
    caption: string,
    parseMode: string,
    disableNotification: boolean,
    options: any,
  ) {
    const photo = MediaInputHelper.toTelegramInput(cover);
    const hasSpoiler = MediaInputHelper.getHasSpoiler(cover);

    return await bot.api.sendPhoto(chatId, photo, {
      caption,
      parse_mode: parseMode as any,
      disable_notification: disableNotification,
      has_spoiler: hasSpoiler,
      reply_markup: options.inlineKeyboard
        ? { inline_keyboard: options.inlineKeyboard }
        : undefined,
      protect_content: options.protectContent,
    });
  }

  private async sendVideo(
    bot: Bot,
    chatId: string,
    video: any,
    caption: string,
    parseMode: string,
    disableNotification: boolean,
    options: any,
  ) {
    const videoInput = MediaInputHelper.toTelegramInput(video);
    const hasSpoiler = MediaInputHelper.getHasSpoiler(video);

    return await bot.api.sendVideo(chatId, videoInput, {
      caption,
      parse_mode: parseMode as any,
      disable_notification: disableNotification,
      has_spoiler: hasSpoiler,
      protect_content: options.protectContent,
    });
  }

  private async sendAudio(
    bot: Bot,
    chatId: string,
    audio: any,
    caption: string,
    parseMode: string,
    disableNotification: boolean,
    options: any,
  ) {
    const audioInput = MediaInputHelper.toTelegramInput(audio);

    return await bot.api.sendAudio(chatId, audioInput, {
      caption,
      parse_mode: parseMode as any,
      disable_notification: disableNotification,
      protect_content: options.protectContent,
    });
  }

  private async sendDocument(
    bot: Bot,
    chatId: string,
    document: any,
    caption: string,
    parseMode: string,
    disableNotification: boolean,
    options: any,
  ) {
    const documentInput = MediaInputHelper.toTelegramInput(document);

    return await bot.api.sendDocument(chatId, documentInput, {
      caption,
      parse_mode: parseMode as any,
      disable_notification: disableNotification,
      protect_content: options.protectContent,
    });
  }

  private async sendMediaGroup(
    bot: Bot,
    chatId: string,
    media: any[],
    caption: string,
    parseMode: string,
    disableNotification: boolean,
  ) {
    // Telegram media group (up to 10 items)
    const mediaGroup = media.slice(0, 10).map((item, index) => {
      const url = MediaInputHelper.getUrl(item);
      const fileId = MediaInputHelper.getFileId(item);
      const hasSpoiler = MediaInputHelper.getHasSpoiler(item);
      const mediaInput = fileId || url;

      if (!mediaInput) {
        throw new BadRequestException(
          `Media item at index ${index} must have either url or fileId`,
        );
      }

      // Determine if it's video or photo based on URL extension
      const isVideo = url ? url.match(/\.(mp4|mov|avi|mkv)$/i) : false;

      return {
        type: isVideo ? 'video' : 'photo',
        media: mediaInput,
        caption: index === 0 ? caption : undefined,
        parse_mode: index === 0 ? (parseMode as any) : undefined,
        has_spoiler: hasSpoiler,
      } as any;
    });

    return await bot.api.sendMediaGroup(chatId, mediaGroup, {
      disable_notification: disableNotification,
    });
  }

  private validateRequiredFields(request: PostRequestDto, type: PostType): void {
    switch (type) {
      case PostType.POST:
        // No media fields should be present
        if (
          MediaInputHelper.isDefined(request.cover) ||
          MediaInputHelper.isDefined(request.video) ||
          MediaInputHelper.isDefined(request.audio) ||
          MediaInputHelper.isDefined(request.document) ||
          MediaInputHelper.isNotEmpty(request.media)
        ) {
          throw new BadRequestException("For type 'post', media fields must not be provided");
        }
        if (request.body && request.body.length > 4096) {
          throw new BadRequestException('Text message exceeds maximum length of 4096 characters');
        }
        break;

      case PostType.IMAGE:
        if (!MediaInputHelper.isDefined(request.cover)) {
          throw new BadRequestException("Field 'cover' is required for type 'image'");
        }
        this.warnIgnoredFields(request, ['media', 'video', 'audio', 'document']);
        break;

      case PostType.VIDEO:
        if (!MediaInputHelper.isDefined(request.video)) {
          throw new BadRequestException("Field 'video' is required for type 'video'");
        }
        this.warnIgnoredFields(request, ['media', 'cover', 'audio', 'document']);
        break;

      case PostType.AUDIO:
        if (!MediaInputHelper.isDefined(request.audio)) {
          throw new BadRequestException("Field 'audio' is required for type 'audio'");
        }
        this.warnIgnoredFields(request, ['media', 'cover', 'video', 'document']);
        break;

      case PostType.DOCUMENT:
        if (!MediaInputHelper.isDefined(request.document)) {
          throw new BadRequestException("Field 'document' is required for type 'document'");
        }
        this.warnIgnoredFields(request, ['media', 'cover', 'video', 'audio']);
        break;

      case PostType.ALBUM:
        if (!MediaInputHelper.isNotEmpty(request.media)) {
          throw new BadRequestException("Field 'media' is required for type 'album'");
        }
        if (request.media!.length < 2) {
          throw new BadRequestException('Album must contain at least 2 media items');
        }
        if (request.media!.length > 10) {
          throw new BadRequestException('Album cannot contain more than 10 media items');
        }
        this.warnIgnoredFields(request, ['cover', 'video', 'audio', 'document']);
        break;
    }
  }

  private warnIgnoredFields(request: PostRequestDto, fields: string[]): void {
    const ignoredFields: string[] = [];

    for (const field of fields) {
      if (field === 'media' && MediaInputHelper.isNotEmpty((request as any)[field])) {
        ignoredFields.push(field);
      } else if (MediaInputHelper.isDefined((request as any)[field])) {
        ignoredFields.push(field);
      }
    }

    if (ignoredFields.length > 0) {
      this.logger.warn(`Fields ${ignoredFields.join(', ')} will be ignored for this post type`);
    }
  }

  private logIgnoredFields(request: PostRequestDto): void {
    const ignoredFields: string[] = [];

    if (request.title) ignoredFields.push('title');
    if (request.description) ignoredFields.push('description');
    if (request.postLanguage) ignoredFields.push('postLanguage');
    if (request.tags) ignoredFields.push('tags');
    if (request.mode) ignoredFields.push('mode');
    if (request.scheduledAt) ignoredFields.push('scheduledAt');

    if (ignoredFields.length > 0) {
      this.logger.warn(
        `Fields ${ignoredFields.join(', ')} are not used by Telegram and will be ignored`,
      );
    }
  }

  private validateMediaUrls(request: PostRequestDto): void {
    // Validate only URLs, not file_ids
    const validateIfUrl = (media: any) => {
      const url = MediaInputHelper.getUrl(media);
      if (url) {
        this.mediaService.validateMediaUrl(url);
      }
    };

    if (request.cover) validateIfUrl(request.cover);
    if (request.video) validateIfUrl(request.video);
    if (request.audio) validateIfUrl(request.audio);
    if (request.document) validateIfUrl(request.document);
    if (request.media) {
      request.media.forEach(validateIfUrl);
    }
  }

  private getTargetBodyFormat(parseMode?: string): BodyFormat {
    switch (parseMode) {
      case 'HTML':
        return BodyFormat.HTML;
      case 'Markdown':
      case 'MarkdownV2':
        return BodyFormat.MARKDOWN;
      default:
        return BodyFormat.HTML;
    }
  }

  private buildPostUrl(chatId: string, messageId: number): string | undefined {
    // For public channels, we can build URL
    if (chatId.startsWith('@')) {
      const channelName = chatId.substring(1);
      return `https://t.me/${channelName}/${messageId}`;
    }
    return undefined;
  }
}
