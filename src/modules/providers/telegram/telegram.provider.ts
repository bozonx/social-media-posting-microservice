import { Injectable, Logger } from '@nestjs/common';
import { Bot, InputFile } from 'grammy';
import { IProvider } from '../base/provider.interface';
import { PostType, BodyFormat } from '../../../common/enums';
import { PostRequestDto } from '../../post/dto';
import { ConverterService } from '../../converter/converter.service';
import { MediaService } from '../../media/media.service';

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
        PostType.POST,
        PostType.IMAGE,
        PostType.VIDEO,
        PostType.ALBUM,
        PostType.DOCUMENT,
    ];

    private readonly logger = new Logger(TelegramProvider.name);

    constructor(
        private readonly converterService: ConverterService,
        private readonly mediaService: MediaService,
    ) { }

    async publish(request: PostRequestDto, channelConfig: TelegramChannelConfig) {
        const { botToken, chatId } = channelConfig.auth;
        const bot = new Bot(botToken);

        // Валидация медиа URL
        if (request.cover) {
            this.mediaService.validateMediaUrl(request.cover);
        }
        if (request.video) {
            this.mediaService.validateMediaUrl(request.video);
        }
        if (request.media) {
            this.mediaService.validateMediaUrls(request.media);
        }

        // Конвертация body
        const shouldConvert = request.convertBody ?? channelConfig.convertBody ?? true;
        const targetFormat = this.getTargetBodyFormat(channelConfig.parseMode);
        const sourceFormat = request.bodyFormat || BodyFormat.TEXT;

        let processedBody = request.body;
        if (shouldConvert && sourceFormat !== targetFormat) {
            processedBody = this.converterService.convert(
                request.body,
                sourceFormat,
                targetFormat,
            );
        }

        // Санитизация HTML если используется HTML mode
        if (channelConfig.parseMode === 'HTML' && targetFormat === BodyFormat.HTML) {
            processedBody = this.converterService.sanitizeHtml(processedBody);
        }

        // Платформо-специфичные параметры
        const platformData = request.platformData || {};
        const parseMode = platformData.parseMode || channelConfig.parseMode || 'HTML';
        const disableNotification =
            platformData.disableNotification ?? channelConfig.disableNotification ?? false;

        // Публикация в зависимости от типа
        const type = request.type || PostType.POST;

        try {
            let result: any;

            switch (type) {
                case PostType.POST:
                    result = await bot.api.sendMessage(chatId, processedBody, {
                        parse_mode: parseMode,
                        disable_notification: disableNotification,
                        reply_markup: platformData.inlineKeyboard
                            ? { inline_keyboard: platformData.inlineKeyboard }
                            : undefined,
                        link_preview_options: platformData.disableWebPagePreview
                            ? { is_disabled: true }
                            : undefined,
                        reply_to_message_id: platformData.replyToMessageId,
                        protect_content: platformData.protectContent,
                    });
                    break;

                case PostType.IMAGE:
                    if (!request.cover) {
                        throw new Error('Cover image is required for IMAGE type');
                    }
                    result = await bot.api.sendPhoto(chatId, request.cover, {
                        caption: processedBody,
                        parse_mode: parseMode,
                        disable_notification: disableNotification,
                        reply_markup: platformData.inlineKeyboard
                            ? { inline_keyboard: platformData.inlineKeyboard }
                            : undefined,
                    });
                    break;

                case PostType.VIDEO:
                    if (!request.video) {
                        throw new Error('Video URL is required for VIDEO type');
                    }
                    result = await bot.api.sendVideo(chatId, request.video, {
                        caption: processedBody,
                        parse_mode: parseMode,
                        disable_notification: disableNotification,
                    });
                    break;

                case PostType.ALBUM:
                    if (!request.media || request.media.length === 0) {
                        throw new Error('Media array is required for ALBUM type');
                    }
                    // Telegram media group (до 10 элементов)
                    const mediaGroup = request.media.slice(0, 10).map((url, index) => ({
                        type: 'photo' as const,
                        media: url,
                        caption: index === 0 ? processedBody : undefined,
                        parse_mode: index === 0 ? parseMode : undefined,
                    }));

                    result = await bot.api.sendMediaGroup(chatId, mediaGroup, {
                        disable_notification: disableNotification,
                    });
                    break;

                case PostType.DOCUMENT:
                    if (!request.cover) {
                        throw new Error('Document URL is required for DOCUMENT type');
                    }
                    result = await bot.api.sendDocument(chatId, request.cover, {
                        caption: processedBody,
                        parse_mode: parseMode,
                        disable_notification: disableNotification,
                    });
                    break;

                default:
                    throw new Error(`Unsupported post type: ${type}`);
            }

            this.logger.log(`Published to Telegram chat ${chatId}, type: ${type}`);

            return {
                postId: String(result.message_id || result[0]?.message_id),
                url: this.buildPostUrl(chatId, result.message_id || result[0]?.message_id),
                raw: result,
            };
        } finally {
            // Закрываем бота для освобождения ресурсов
            await bot.stop();
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
        // Для публичных каналов можно построить URL
        if (chatId.startsWith('@')) {
            const channelName = chatId.substring(1);
            return `https://t.me/${channelName}/${messageId}`;
        }
        return undefined;
    }
}
