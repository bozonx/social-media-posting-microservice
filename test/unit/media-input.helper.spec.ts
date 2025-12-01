import { MediaInputHelper } from '@/common/helpers/media-input.helper';

describe('MediaInputHelper', () => {
  describe('isString', () => {
    it('should return true for string URL', () => {
      expect(MediaInputHelper.isString('https://example.com/image.jpg')).toBe(true);
    });

    it('should return false for object', () => {
      expect(MediaInputHelper.isString({ url: 'https://example.com/image.jpg' })).toBe(false);
    });

    it('should return false for null', () => {
      expect(MediaInputHelper.isString(null as any)).toBe(false);
    });
  });

  describe('isObject', () => {
    it('should return true for object with url', () => {
      expect(MediaInputHelper.isObject({ url: 'https://example.com/image.jpg' })).toBe(true);
    });

    it('should return true for object with fileId', () => {
      expect(MediaInputHelper.isObject({ fileId: 'AgACAgIAAxkBAAIC...' })).toBe(true);
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
      expect(MediaInputHelper.getUrl({ url: 'https://example.com/image.jpg' })).toBe(
        'https://example.com/image.jpg',
      );
    });

    it('should return undefined for object without url', () => {
      expect(MediaInputHelper.getUrl({ fileId: 'AgACAgIAAxkBAAIC...' })).toBeUndefined();
    });

    it('should return undefined for null', () => {
      expect(MediaInputHelper.getUrl(null as any)).toBeUndefined();
    });
  });

  describe('getFileId', () => {
    it('should return fileId from object input', () => {
      expect(MediaInputHelper.getFileId({ fileId: 'AgACAgIAAxkBAAIC...' })).toBe(
        'AgACAgIAAxkBAAIC...',
      );
    });

    it('should return undefined for string input', () => {
      expect(MediaInputHelper.getFileId('https://example.com/image.jpg')).toBeUndefined();
    });

    it('should return undefined for object without fileId', () => {
      expect(MediaInputHelper.getFileId({ url: 'https://example.com/image.jpg' })).toBeUndefined();
    });
  });

  describe('getHasSpoiler', () => {
    it('should return true when hasSpoiler is true', () => {
      expect(
        MediaInputHelper.getHasSpoiler({ url: 'https://example.com/image.jpg', hasSpoiler: true }),
      ).toBe(true);
    });

    it('should return false when hasSpoiler is false', () => {
      expect(
        MediaInputHelper.getHasSpoiler({ url: 'https://example.com/image.jpg', hasSpoiler: false }),
      ).toBe(false);
    });

    it('should return false when hasSpoiler is not set', () => {
      expect(MediaInputHelper.getHasSpoiler({ url: 'https://example.com/image.jpg' })).toBe(false);
    });

    it('should return false for string input', () => {
      expect(MediaInputHelper.getHasSpoiler('https://example.com/image.jpg')).toBe(false);
    });
  });

  describe('toTelegramInput', () => {
    it('should return fileId when available', () => {
      const result = MediaInputHelper.toTelegramInput({
        fileId: 'AgACAgIAAxkBAAIC...',
        url: 'https://example.com/image.jpg',
      });
      expect(result).toBe('AgACAgIAAxkBAAIC...');
    });

    it('should return URL when fileId is not available', () => {
      const result = MediaInputHelper.toTelegramInput({ url: 'https://example.com/image.jpg' });
      expect(result).toBe('https://example.com/image.jpg');
    });

    it('should return URL for string input', () => {
      const result = MediaInputHelper.toTelegramInput('https://example.com/image.jpg');
      expect(result).toBe('https://example.com/image.jpg');
    });

    it('should throw error when neither url nor fileId is available', () => {
      expect(() => MediaInputHelper.toTelegramInput({} as any)).toThrow(
        'MediaInput must have either url or fileId',
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
      expect(MediaInputHelper.isDefined({ url: 'https://example.com/image.jpg' })).toBe(true);
    });

    it('should return false for undefined', () => {
      expect(MediaInputHelper.isDefined(undefined)).toBe(false);
    });

    it('should return false for null', () => {
      expect(MediaInputHelper.isDefined(null as any)).toBe(false);
    });
  });
});
