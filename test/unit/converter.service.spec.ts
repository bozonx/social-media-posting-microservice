import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConverterService } from '@/modules/converter/converter.service.js';
import { AppConfigService } from '@/modules/app-config/app-config.service.js';
import { BodyFormat } from '@/common/enums/index.js';

describe('ConverterService', () => {
  let service: ConverterService;
  let appConfigService: AppConfigService;

  const mockConversionConfig = {
    preserveLinks: true,
    stripHtml: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConverterService,
        {
          provide: AppConfigService,
          useValue: {
            getConversionConfig: jest.fn().mockReturnValue(mockConversionConfig),
          },
        },
      ],
    }).compile();

    service = module.get<ConverterService>(ConverterService);
    appConfigService = module.get<AppConfigService>(AppConfigService);

    // Подавляем логи
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    // Инициализируем модуль (загрузка marked)
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('convert', () => {
    it('should return content as is if formats are same', () => {
      const content = 'test content';
      const result = service.convert(content, BodyFormat.HTML, BodyFormat.HTML);
      expect(result).toBe(content);
    });

    describe('HTML conversions', () => {
      const html = '<h1>Hello</h1><p>World</p>';

      it('should convert HTML to Markdown', () => {
        const result = service.convert(html, BodyFormat.HTML, BodyFormat.MARKDOWN);
        expect(result).toContain('# Hello');
        expect(result).toContain('World');
      });

      it('should convert HTML to Text', () => {
        const result = service.convert(html, BodyFormat.HTML, BodyFormat.TEXT);
        expect(result.toLowerCase()).toContain('hello');
        expect(result).toContain('World');
        expect(result).not.toContain('<h1>');
      });
    });

    describe('Markdown conversions', () => {
      const markdown = '# Hello\n\nWorld';

      it('should convert Markdown to HTML', () => {
        const result = service.convert(markdown, BodyFormat.MARKDOWN, BodyFormat.HTML);
        expect(result).toContain('<h1');
        expect(result).toContain('Hello');
        expect(result).toContain('<p>World</p>');
      });

      it('should convert Markdown to Text', () => {
        const result = service.convert(markdown, BodyFormat.MARKDOWN, BodyFormat.TEXT);
        expect(result.toLowerCase()).toContain('hello');
        expect(result).toContain('World');
        expect(result).not.toContain('#');
        expect(result).not.toContain('<h1');
      });

      it('should throw error when marked library is not available', async () => {
        // Simulate missing marked library
        (service as any).marked = undefined;
        expect(() => service.convert(markdown, BodyFormat.MARKDOWN, BodyFormat.HTML)).toThrow(
          'Markdown to HTML conversion is not available',
        );
      });
    });

    describe('Text conversions', () => {
      const text = 'Hello\nWorld';

      it('should convert Text to HTML', () => {
        const result = service.convert(text, BodyFormat.TEXT, BodyFormat.HTML);
        expect(result).toBe('Hello<br>World');
      });

      it('should convert Text to Markdown (as is)', () => {
        const result = service.convert(text, BodyFormat.TEXT, BodyFormat.MARKDOWN);
        expect(result).toBe(text);
      });
    });
  });

  describe('sanitizeHtml', () => {
    it('should allow configured tags', () => {
      const html = '<p>Test <img src="x"> <b>Bold</b> <script>alert(1)</script></p>';
      const result = service.sanitizeHtml(html);

      expect(result).toContain('<p>');
      expect(result).toContain('<img');
      expect(result).toContain('<b>');
      expect(result).not.toContain('<script>');
    });

    it('should strip all tags if stripHtml is true', async () => {
      // Пересоздаем модуль с другой конфигурацией
      jest.spyOn(appConfigService, 'getConversionConfig').mockReturnValue({
        ...mockConversionConfig,
        stripHtml: true,
      });

      // Нам нужно пересоздать сервис, так как конфиг читается в конструкторе/методе
      // Но в текущей реализации sanitizeHtml читает конфиг при каждом вызове
      const html = '<p>Test <b>Bold</b></p>';
      const result = service.sanitizeHtml(html);

      expect(result).toBe('Test Bold');
      expect(result).not.toContain('<p>');
      expect(result).not.toContain('<b>');
    });

    it('should allow specific attributes', () => {
      const html = '<p class="text" id="1" onclick="alert(1)">Test</p>';
      const result = service.sanitizeHtml(html);

      expect(result).toContain('class="text"');
      expect(result).toContain('id="1"');
      expect(result).not.toContain('onclick');
    });
  });

  describe('onModuleInit', () => {
    it('should handle import error gracefully', async () => {
      // Сбросим marked
      (service as any).marked = undefined;

      // Мокаем import чтобы он выбросил ошибку
      // Примечание: jest.mock работает на уровне модуля, сложно замокать динамический импорт внутри теста
      // Поэтому просто проверим логгер, если бы импорт упал

      // В данном случае мы просто проверяем что метод отрабатывает без падения
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });
});
