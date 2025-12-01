import { Injectable, BadRequestException } from '@nestjs/common';
import { PostRequestDto, PreviewResponseDto, PreviewErrorResponseDto } from './dto';
import { PostType, BodyFormat } from '../../common/enums';
import { AppConfigService } from '../app-config/app-config.service';
import { ConverterService } from '../converter/converter.service';
import { TelegramTypeDetector } from '../providers/telegram/telegram-type-detector.service';
import { MediaInputHelper } from '../../common/helpers/media-input.helper';
import { MediaService } from '../media/media.service';

@Injectable()
export class PreviewService {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly converterService: ConverterService,
    private readonly telegramTypeDetector: TelegramTypeDetector,
    private readonly mediaService: MediaService,
  ) {}

  async preview(request: PostRequestDto): Promise<PreviewResponseDto | PreviewErrorResponseDto> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate platform
    const platform = request.platform?.toLowerCase();
    if (!platform) {
      errors.push("Field 'platform' is required");
    } else if (platform !== 'telegram') {
      errors.push(`Platform '${platform}' is not supported`);
    }

    // Validate channel or auth
    let channelConfig: any;
    if (request.channel) {
      try {
        channelConfig = this.appConfig.getChannel(request.channel);
        if (channelConfig.provider !== platform) {
          errors.push(
            `Channel provider '${channelConfig.provider}' does not match requested platform '${platform}'`,
          );
        }
      } catch {
        errors.push(`Channel '${request.channel}' not found in configuration`);
      }
    } else if (request.auth) {
      channelConfig = {
        provider: platform,
        enabled: true,
        auth: request.auth,
      };
    } else {
      errors.push("Either 'channel' or 'auth' must be provided");
    }

    // Validate ambiguous media fields
    const ambiguousError = this.validateAmbiguousMedia(request);
    if (ambiguousError) {
      errors.push(ambiguousError);
    }

    // Detect type
    let detectedType = PostType.POST;
    if (platform === 'telegram') {
      detectedType = this.telegramTypeDetector.detectType(request);
    }

    // Validate required fields for type
    const typeErrors = this.validateRequiredFields(request, detectedType);
    errors.push(...typeErrors);

    // Validate media URLs
    const mediaErrors = this.validateMediaUrls(request);
    errors.push(...mediaErrors);

    // Collect warnings for ignored fields (Telegram-specific)
    if (platform === 'telegram') {
      warnings.push(...this.getIgnoredFieldsWarnings(request));
      warnings.push(...this.getIgnoredMediaWarnings(request, detectedType));
    }

    // If there are errors, return error response
    if (errors.length > 0) {
      return {
        success: false,
        data: {
          valid: false,
          errors,
          warnings,
        },
      };
    }

    // Convert body
    const shouldConvert = request.convertBody ?? channelConfig?.convertBody ?? true;
    const targetFormat = this.getTargetBodyFormat(
      channelConfig?.parseMode || request.options?.parseMode,
    );
    const sourceFormat = request.bodyFormat || BodyFormat.TEXT;

    let convertedBody = request.body;
    if (shouldConvert && sourceFormat !== targetFormat) {
      convertedBody = this.converterService.convert(request.body, sourceFormat, targetFormat);
    }

    // Sanitize HTML if needed
    if (targetFormat === BodyFormat.HTML) {
      convertedBody = this.converterService.sanitizeHtml(convertedBody);
    }

    // Check length limits
    const limits = this.getLimits(detectedType, channelConfig);
    if (convertedBody.length > limits.maxLength) {
      warnings.push(
        `Body length (${convertedBody.length}) exceeds platform limit (${limits.maxLength})`,
      );
    }

    return {
      success: true,
      data: {
        valid: true,
        detectedType,
        convertedBody,
        targetFormat,
        convertedBodyLength: convertedBody.length,
        warnings,
      },
    };
  }

  private validateAmbiguousMedia(request: PostRequestDto): string | null {
    if (request.type !== PostType.AUTO && request.type !== undefined) {
      return null;
    }

    if (MediaInputHelper.isNotEmpty(request.media)) {
      return null;
    }

    const mediaFields: string[] = [];

    if (MediaInputHelper.isDefined(request.document)) {
      mediaFields.push('document');
    }
    if (MediaInputHelper.isDefined(request.audio)) {
      mediaFields.push('audio');
    }
    if (MediaInputHelper.isDefined(request.video)) {
      mediaFields.push('video');
    }
    if (MediaInputHelper.isDefined(request.cover)) {
      mediaFields.push('cover');
    }

    if (mediaFields.length > 1) {
      return (
        `Ambiguous media fields: cannot use ${mediaFields.map(f => `'${f}'`).join(' and ')} together. ` +
        `Please specify only one media type or set explicit 'type'.`
      );
    }

    return null;
  }

  private validateRequiredFields(request: PostRequestDto, type: PostType): string[] {
    const errors: string[] = [];

    switch (type) {
      case PostType.POST:
        if (
          MediaInputHelper.isDefined(request.cover) ||
          MediaInputHelper.isDefined(request.video) ||
          MediaInputHelper.isDefined(request.audio) ||
          MediaInputHelper.isDefined(request.document) ||
          MediaInputHelper.isNotEmpty(request.media)
        ) {
          errors.push("For type 'post', media fields must not be provided");
        }
        break;

      case PostType.IMAGE:
        if (!MediaInputHelper.isDefined(request.cover)) {
          errors.push("Field 'cover' is required for type 'image'");
        }
        break;

      case PostType.VIDEO:
        if (!MediaInputHelper.isDefined(request.video)) {
          errors.push("Field 'video' is required for type 'video'");
        }
        break;

      case PostType.AUDIO:
        if (!MediaInputHelper.isDefined(request.audio)) {
          errors.push("Field 'audio' is required for type 'audio'");
        }
        break;

      case PostType.DOCUMENT:
        if (!MediaInputHelper.isDefined(request.document)) {
          errors.push("Field 'document' is required for type 'document'");
        }
        break;

      case PostType.ALBUM:
        if (!MediaInputHelper.isNotEmpty(request.media)) {
          errors.push("Field 'media' is required for type 'album'");
        }
        break;
    }

    return errors;
  }

  private validateMediaUrls(request: PostRequestDto): string[] {
    const errors: string[] = [];

    const validateIfUrl = (media: any, fieldName: string) => {
      const url = MediaInputHelper.getUrl(media);
      if (url) {
        try {
          this.mediaService.validateMediaUrl(url);
        } catch (error: any) {
          errors.push(`Invalid ${fieldName} URL: ${error.message}`);
        }
      }
    };

    if (request.cover) validateIfUrl(request.cover, 'cover');
    if (request.video) validateIfUrl(request.video, 'video');
    if (request.audio) validateIfUrl(request.audio, 'audio');
    if (request.document) validateIfUrl(request.document, 'document');
    if (request.media) {
      request.media.forEach((item, index) => validateIfUrl(item, `media[${index}]`));
    }

    return errors;
  }

  private getIgnoredFieldsWarnings(request: PostRequestDto): string[] {
    const warnings: string[] = [];
    const ignoredFields: string[] = [];

    if (request.title) ignoredFields.push('title');
    if (request.description) ignoredFields.push('description');
    if (request.postLanguage) ignoredFields.push('postLanguage');
    if (request.tags) ignoredFields.push('tags');
    if (request.mode) ignoredFields.push('mode');
    if (request.scheduledAt) ignoredFields.push('scheduledAt');

    if (ignoredFields.length > 0) {
      warnings.push(
        `Fields ${ignoredFields.join(', ')} are not used by Telegram and will be ignored`,
      );
    }

    return warnings;
  }

  private getIgnoredMediaWarnings(request: PostRequestDto, type: PostType): string[] {
    const warnings: string[] = [];
    const ignoredFields: string[] = [];

    const checkField = (field: string, value: any, isArray = false) => {
      if (isArray ? MediaInputHelper.isNotEmpty(value) : MediaInputHelper.isDefined(value)) {
        ignoredFields.push(field);
      }
    };

    switch (type) {
      case PostType.IMAGE:
        checkField('media', request.media, true);
        checkField('video', request.video);
        checkField('audio', request.audio);
        checkField('document', request.document);
        break;

      case PostType.VIDEO:
        checkField('media', request.media, true);
        checkField('cover', request.cover);
        checkField('audio', request.audio);
        checkField('document', request.document);
        break;

      case PostType.AUDIO:
        checkField('media', request.media, true);
        checkField('cover', request.cover);
        checkField('video', request.video);
        checkField('document', request.document);
        break;

      case PostType.DOCUMENT:
        checkField('media', request.media, true);
        checkField('cover', request.cover);
        checkField('video', request.video);
        checkField('audio', request.audio);
        break;

      case PostType.ALBUM:
        checkField('cover', request.cover);
        checkField('video', request.video);
        checkField('audio', request.audio);
        checkField('document', request.document);
        break;
    }

    if (ignoredFields.length > 0) {
      warnings.push(`Fields ${ignoredFields.join(', ')} will be ignored for type '${type}'`);
    }

    return warnings;
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

  private getLimits(type: PostType, channelConfig?: any): { maxLength: number } {
    const isCaption =
      type === PostType.IMAGE ||
      type === PostType.VIDEO ||
      type === PostType.AUDIO ||
      type === PostType.DOCUMENT ||
      type === PostType.ALBUM;

    if (isCaption) {
      return { maxLength: channelConfig?.maxCaptionLength ?? 1024 };
    }

    return { maxLength: channelConfig?.maxTextLength ?? 4096 };
  }
}
