import { Injectable } from '@nestjs/common';
import TurndownService from 'turndown';
import { convert as htmlToText } from 'html-to-text';
import sanitizeHtml from 'sanitize-html';
import { BodyFormat } from '../../common/enums';
import { AppConfigService } from '../app-config/app-config.service';

@Injectable()
export class ConverterService {
    private readonly turndownService: TurndownService;

    constructor(private readonly appConfig: AppConfigService) {
        const conversionConfig = this.appConfig.getConversionConfig();

        this.turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
            emDelimiter: '_',
        });

        // Настройка правил конвертации
        if (conversionConfig.preserveLinks) {
            // Links сохраняются по умолчанию в turndown
        }
    }

    convert(
        content: string,
        fromFormat: BodyFormat,
        toFormat: BodyFormat,
    ): string {
        if (fromFormat === toFormat) {
            return content;
        }

        // HTML → другие форматы
        if (fromFormat === BodyFormat.HTML) {
            if (toFormat === BodyFormat.MARKDOWN) {
                return this.htmlToMarkdown(content);
            }
            if (toFormat === BodyFormat.TEXT) {
                return this.htmlToPlainText(content);
            }
        }

        // Markdown → другие форматы
        if (fromFormat === BodyFormat.MARKDOWN) {
            if (toFormat === BodyFormat.HTML) {
                return this.markdownToHtml(content);
            }
            if (toFormat === BodyFormat.TEXT) {
                // Markdown → HTML → Text
                const html = this.markdownToHtml(content);
                return this.htmlToPlainText(html);
            }
        }

        // Text → другие форматы (базовая конвертация)
        if (fromFormat === BodyFormat.TEXT) {
            if (toFormat === BodyFormat.HTML) {
                return this.textToHtml(content);
            }
            if (toFormat === BodyFormat.MARKDOWN) {
                return content; // Text уже похож на markdown
            }
        }

        return content;
    }

    sanitizeHtml(html: string): string {
        const conversionConfig = this.appConfig.getConversionConfig();

        return sanitizeHtml(html, {
            allowedTags: conversionConfig.stripHtml
                ? []
                : sanitizeHtml.defaults.allowedTags.concat([
                    'img',
                    'video',
                    'audio',
                    'iframe',
                ]),
            allowedAttributes: {
                ...sanitizeHtml.defaults.allowedAttributes,
                '*': ['class', 'id'],
            },
        });
    }

    private htmlToMarkdown(html: string): string {
        return this.turndownService.turndown(html);
    }

    private markdownToHtml(markdown: string): string {
        // Используем простую регулярную конвертацию для базовой поддержки
        // Полноценный marked можно будет добавить позже через dynamic import
        let html = markdown;

        // Заголовки
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // Жирный
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Курсив
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Ссылки
        html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href=\"$2\">$1</a>');

        // Переносы строк
        html = html.replace(/\n/g, '<br>');

        return html;
    }

    private htmlToPlainText(html: string): string {
        return htmlToText(html, {
            wordwrap: false,
            preserveNewlines: true,
        });
    }

    private textToHtml(text: string): string {
        // Простая конвертация: заменяем переносы строк на <br>
        return text.replace(/\n/g, '<br>');
    }
}
