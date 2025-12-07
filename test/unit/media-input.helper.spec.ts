import { describe, it, expect } from '@jest/globals';
import { MediaInputHelper } from '@/common/helpers/media-input.helper.js';

describe('MediaInputHelper', () => {
  describe('isString', () => {
    it('should return true for string URL', () => {
      expect(MediaInputHelper.isString('https://example.com/image.jpg')).toBe(true);
    });

    it('should return false for object', () => {
      expect(MediaInputHelper.isString({ src: 'https://example.com/image.jpg' })).toBe(false);
    });

    it('should return false for null', () => {
      expect(MediaInputHelper.isString(null as any)).toBe(false);
    });
  });

  describe('isObject', () => {
    it('should return true for object with src (URL)', () => {
      expect(MediaInputHelper.isObject({ src: 'https://example.com/image.jpg' })).toBe(true);
    });

    it('should return true for object with src (fileId)', () => {
      expect(MediaInputHelper.isObject({ src: 'AgACAgIAAxkBAAIC...' })).toBe(true);
    });

    it('should return false for string', () => {
      expect(MediaInputHelper.isObject('https://example.com/image.jpg')).toBe(false);
    });

    it('should return false for null', () => {
      expect(MediaInputHelper.isObject(null as any)).toBe(false);
    });
  });

  describe('getUrl', () => {
    it('should return URL from string input', () => {
      expect(MediaInputHelper.getUrl('https://example.com/image.jpg')).toBe(
        'https://example.com/image.jpg',
      );
    });

    it('should return URL from object input', () => {
      expect(MediaInputHelper.getUrl({ src: 'https://example.com/image.jpg' })).toBe(
        'https://example.com/image.jpg',
      );
    });

    it('should return undefined for file_id string (non-URL)', () => {
      expect(MediaInputHelper.getUrl('AgACAgIAAxkBAAIC...')).toBeUndefined();
    });

    it('should return undefined for object with fileId src', () => {
      expect(MediaInputHelper.getUrl({ src: 'AgACAgIAAxkBAAIC...' })).toBeUndefined();
    });

    it('should return undefined for null', () => {
      expect(MediaInputHelper.getUrl(null as any)).toBeUndefined();
    });
  });

  describe('getFileId', () => {
    it('should return fileId from object input', () => {
      expect(MediaInputHelper.getFileId({ src: 'AgACAgIAAxkBAAIC...' })).toBe(
        'AgACAgIAAxkBAAIC...',
      );
    });

    it('should return fileId from string input (non-URL)', () => {
      expect(MediaInputHelper.getFileId('AgACAgIAAxkBAAIC...')).toBe('AgACAgIAAxkBAAIC...');
    });

    it('should return undefined for URL string', () => {
      expect(MediaInputHelper.getFileId('https://example.com/image.jpg')).toBeUndefined();
    });

    it('should return undefined for object with URL src', () => {
      expect(MediaInputHelper.getFileId({ src: 'https://example.com/image.jpg' })).toBeUndefined();
    });
  });

  describe('getHasSpoiler', () => {
    it('should return true when hasSpoiler is true', () => {
      expect(
        MediaInputHelper.getHasSpoiler({ src: 'https://example.com/image.jpg', hasSpoiler: true }),
      ).toBe(true);
    });

    it('should return false when hasSpoiler is false', () => {
      expect(
        MediaInputHelper.getHasSpoiler({ src: 'https://example.com/image.jpg', hasSpoiler: false }),
      ).toBe(false);
    });

    it('should return false when hasSpoiler is not set', () => {
      expect(MediaInputHelper.getHasSpoiler({ src: 'https://example.com/image.jpg' })).toBe(false);
    });

    it('should return false for string input', () => {
      expect(MediaInputHelper.getHasSpoiler('https://example.com/image.jpg')).toBe(false);
    });
  });

  describe('getType', () => {
    it('should return type from object input', () => {
      expect(
        MediaInputHelper.getType({
          src: 'https://example.com/image.jpg',
          type: 'image',
        } as any),
      ).toBe('image');
    });

    it('should return undefined when type is not set', () => {
      expect(
        MediaInputHelper.getType({
          src: 'https://example.com/image.jpg',
        } as any),
      ).toBeUndefined();
    });

    it('should return undefined for string input', () => {
      expect(MediaInputHelper.getType('https://example.com/image.jpg' as any)).toBeUndefined();
    });
  });

  describe('toTelegramInput', () => {
    it('should return fileId when available in object (as src)', () => {
      const result = MediaInputHelper.toTelegramInput({
        src: 'AgACAgIAAxkBAAIC...',
      });
      expect(result).toBe('AgACAgIAAxkBAAIC...');
    });

    it('should return URL when src is URL', () => {
      const result = MediaInputHelper.toTelegramInput({ src: 'https://example.com/image.jpg' });
      expect(result).toBe('https://example.com/image.jpg');
    });

    it('should return URL for URL string input', () => {
      const result = MediaInputHelper.toTelegramInput('https://example.com/image.jpg');
      expect(result).toBe('https://example.com/image.jpg');
    });

    it('should return fileId for file_id string input (non-URL)', () => {
      const result = MediaInputHelper.toTelegramInput('AgACAgIAAxkBAAIC...');
      expect(result).toBe('AgACAgIAAxkBAAIC...');
    });

    it('should throw error when src is missing', () => {
      expect(() => MediaInputHelper.toTelegramInput({} as any)).toThrow(
        'MediaInput must be either a string or an object with src property',
      );
    });
  });

  describe('isNotEmpty', () => {
    it('should return true for non-empty array', () => {
      expect(
        MediaInputHelper.isNotEmpty(['https://example.com/1.jpg', 'https://example.com/2.jpg']),
      ).toBe(true);
    });

    it('should return true for array with single item', () => {
      expect(MediaInputHelper.isNotEmpty(['https://example.com/1.jpg'])).toBe(true);
    });

    it('should return false for empty array', () => {
      expect(MediaInputHelper.isNotEmpty([])).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(MediaInputHelper.isNotEmpty(undefined)).toBe(false);
    });

    it('should return false for null', () => {
      expect(MediaInputHelper.isNotEmpty(null as any)).toBe(false);
    });
  });

  describe('isDefined', () => {
    it('should return true for string', () => {
      expect(MediaInputHelper.isDefined('https://example.com/image.jpg')).toBe(true);
    });

    it('should return true for object', () => {
      expect(MediaInputHelper.isDefined({ src: 'https://example.com/image.jpg' })).toBe(true);
    });

    it('should return false for undefined', () => {
      expect(MediaInputHelper.isDefined(undefined)).toBe(false);
    });

    it('should return false for null', () => {
      expect(MediaInputHelper.isDefined(null as any)).toBe(false);
    });
  });
});
