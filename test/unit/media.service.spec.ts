import { describe, it, expect, beforeEach } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MediaService } from '@/modules/media/media.service.js';

describe('MediaService', () => {
  let service: MediaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MediaService],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  describe('validateMediaUrl', () => {
    it('should accept valid HTTP URL', () => {
      expect(() => {
        service.validateMediaUrl('http://example.com/image.jpg');
      }).not.toThrow();
    });

    it('should accept valid HTTPS URL', () => {
      expect(() => {
        service.validateMediaUrl('https://example.com/image.jpg');
      }).not.toThrow();
    });

    it('should accept URL with query parameters', () => {
      expect(() => {
        service.validateMediaUrl('https://example.com/image.jpg?size=large&quality=high');
      }).not.toThrow();
    });

    it('should accept URL with port', () => {
      expect(() => {
        service.validateMediaUrl('https://example.com:8080/image.jpg');
      }).not.toThrow();
    });

    it('should accept URL with hash', () => {
      expect(() => {
        service.validateMediaUrl('https://example.com/image.jpg#section');
      }).not.toThrow();
    });

    it('should accept empty string without throwing', () => {
      expect(() => {
        service.validateMediaUrl('');
      }).not.toThrow();
    });

    it('should reject FTP protocol', () => {
      expect(() => {
        service.validateMediaUrl('ftp://example.com/file.txt');
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateMediaUrl('ftp://example.com/file.txt');
      }).toThrow('Invalid media URL protocol: ftp:');
    });

    it('should reject file protocol', () => {
      expect(() => {
        service.validateMediaUrl('file:///path/to/file.jpg');
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateMediaUrl('file:///path/to/file.jpg');
      }).toThrow('Invalid media URL protocol: file:');
    });

    it('should reject malformed URLs', () => {
      expect(() => {
        service.validateMediaUrl('not-a-url');
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateMediaUrl('not-a-url');
      }).toThrow('Invalid media URL format');
    });

    it('should reject invalid protocol schemes', () => {
      expect(() => {
        service.validateMediaUrl('javascript:alert("XSS")');
      }).toThrow(BadRequestException);
    });

    it('should reject data URLs', () => {
      expect(() => {
        service.validateMediaUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA');
      }).toThrow(BadRequestException);
    });
  });

  describe('validateMediaUrls', () => {
    it('should validate all URLs in array', () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
      ];

      expect(() => {
        service.validateMediaUrls(urls);
      }).not.toThrow();
    });

    it('should accept empty array', () => {
      expect(() => {
        service.validateMediaUrls([]);
      }).not.toThrow();
    });

    it('should throw on first invalid URL', () => {
      const urls = [
        'https://example.com/image1.jpg',
        'ftp://example.com/file.txt',
        'https://example.com/image3.jpg',
      ];

      expect(() => {
        service.validateMediaUrls(urls);
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateMediaUrls(urls);
      }).toThrow('Invalid media URL protocol: ftp:');
    });

    it('should throw on malformed URL in array', () => {
      const urls = [
        'https://example.com/image1.jpg',
        'not-a-url',
        'https://example.com/image3.jpg',
      ];

      expect(() => {
        service.validateMediaUrls(urls);
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateMediaUrls(urls);
      }).toThrow('Invalid media URL format');
    });

    it('should handle array with empty strings', () => {
      const urls = ['https://example.com/image1.jpg', '', 'https://example.com/image3.jpg'];

      expect(() => {
        service.validateMediaUrls(urls);
      }).not.toThrow();
    });

    it('should validate multiple URLs with different formats', () => {
      const urls = [
        'http://example.com/image1.jpg',
        'https://cdn.example.com:443/image2.png?v=123',
        'https://example.com/videos/video.mp4#start=10',
      ];

      expect(() => {
        service.validateMediaUrls(urls);
      }).not.toThrow();
    });
  });
});
