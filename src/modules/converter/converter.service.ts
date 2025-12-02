import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import TurndownService from 'turndown';
import { convert as htmlToText } from 'html-to-text';
import sanitizeHtml from 'sanitize-html';
import { BodyFormat } from '../../common/enums/index.js';
import { AppConfigService } from '../app-config/app-config.service.js';

@Injectable()
export class ConverterService implements OnModuleInit {
  private readonly turndownService: TurndownService;
  private marked: any;
  private readonly logger = new Logger(ConverterService.name);

  /**
   * Initializes the converter service with Turndown configuration
   * Sets up HTML to Markdown conversion rules based on app configuration
   * @param appConfig - Application configuration service
   */
  constructor(private readonly appConfig: AppConfigService) {
    const conversionConfig = this.appConfig.getConversionConfig();

    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '_',
    });

    // Turndown preserves links by default
    if (conversionConfig.preserveLinks) {
      // Links are preserved by default in turndown
    }
  }

  /**
   * Dynamically loads the marked library on module initialization
   * Uses dynamic import to avoid bundling issues
   */
  async onModuleInit() {
    try {
      const markedModule = await import('marked');
      this.marked = markedModule.marked;
    } catch (error) {
      this.logger.error('Failed to load marked library', error);
    }
  }

  /**
   * Convert content between different body formats
   * Supports conversions between HTML, Markdown, and plain text
   * @param content - Content to convert
   * @param fromFormat - Source format
   * @param toFormat - Target format
   * @returns Converted content
   */
  convert(content: string, fromFormat: BodyFormat, toFormat: BodyFormat): string {
    if (fromFormat === toFormat) {
      return content;
    }

    // HTML → other formats
    if (fromFormat === BodyFormat.HTML) {
      if (toFormat === BodyFormat.MARKDOWN) {
        return this.htmlToMarkdown(content);
      }
      if (toFormat === BodyFormat.TEXT) {
        return this.htmlToPlainText(content);
      }
    }

    // Markdown → other formats
    if (fromFormat === BodyFormat.MARKDOWN) {
      if (toFormat === BodyFormat.HTML) {
        return this.markdownToHtml(content);
      }
      if (toFormat === BodyFormat.TEXT) {
        // Markdown → HTML → Text for best results
        const html = this.markdownToHtml(content);
        return this.htmlToPlainText(html);
      }
    }

    // Text → other formats (basic conversion)
    if (fromFormat === BodyFormat.TEXT) {
      if (toFormat === BodyFormat.HTML) {
        return this.textToHtml(content);
      }
      if (toFormat === BodyFormat.MARKDOWN) {
        return content; // Plain text is already similar to markdown
      }
    }

    return content;
  }

  /**
   * Sanitize HTML content to remove potentially dangerous tags
   * Configurable based on app settings
   * @param html - HTML content to sanitize
   * @returns Sanitized HTML
   */
  sanitizeHtml(html: string): string {
    const conversionConfig = this.appConfig.getConversionConfig();

    return sanitizeHtml(html, {
      allowedTags: conversionConfig.stripHtml
        ? []
        : sanitizeHtml.defaults.allowedTags.concat(['img', 'video', 'audio', 'iframe']),
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
    if (!this.marked) {
      this.logger.warn('Marked library not loaded, returning raw markdown');
      return markdown;
    }
    return this.marked.parse(markdown) as string;
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
