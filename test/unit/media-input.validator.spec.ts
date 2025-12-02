import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  IsMediaInputConstraint,
  IsMediaInputArrayConstraint,
} from '@/common/validators/media-input.validator.js';
import type { ValidationArguments } from 'class-validator';

describe('IsMediaInputConstraint', () => {
  let validator: IsMediaInputConstraint;
  const mockArgs = {} as ValidationArguments;

  beforeEach(() => {
    validator = new IsMediaInputConstraint();
  });

  describe('validate', () => {
    it('should return true for null/undefined (optional field)', () => {
      expect(validator.validate(null, mockArgs)).toBe(true);
      expect(validator.validate(undefined, mockArgs)).toBe(true);
    });

    it('should return true for valid URL string', () => {
      expect(validator.validate('https://example.com/image.jpg', mockArgs)).toBe(true);
    });

    it('should return true for valid URL with different protocols', () => {
      expect(validator.validate('http://example.com/image.jpg', mockArgs)).toBe(true);
      expect(validator.validate('https://example.com/path/to/file.pdf', mockArgs)).toBe(true);
    });

    it('should return false for invalid URL string', () => {
      expect(validator.validate('not-a-url', mockArgs)).toBe(false);
      expect(validator.validate('example.com/image.jpg', mockArgs)).toBe(false);
    });

    it('should return true for object with url', () => {
      expect(validator.validate({ url: 'https://example.com/image.jpg' }, mockArgs)).toBe(true);
    });

    it('should return true for object with fileId', () => {
      expect(validator.validate({ fileId: 'AgACAgIAAxkBAAIC...' }, mockArgs)).toBe(true);
    });

    it('should return true for object with both url and fileId', () => {
      expect(
        validator.validate(
          { url: 'https://example.com/image.jpg', fileId: 'AgACAgIAAxkBAAIC...' },
          mockArgs,
        ),
      ).toBe(true);
    });

    it('should return true for object with hasSpoiler boolean', () => {
      expect(
        validator.validate({ url: 'https://example.com/image.jpg', hasSpoiler: true }, mockArgs),
      ).toBe(true);
      expect(
        validator.validate({ url: 'https://example.com/image.jpg', hasSpoiler: false }, mockArgs),
      ).toBe(true);
    });

    it('should return false for object without url or fileId', () => {
      expect(validator.validate({}, mockArgs)).toBe(false);
      expect(validator.validate({ hasSpoiler: true }, mockArgs)).toBe(false);
    });

    it('should return false for object with non-boolean hasSpoiler', () => {
      expect(
        validator.validate({ url: 'https://example.com/image.jpg', hasSpoiler: 'true' }, mockArgs),
      ).toBe(false);
      expect(
        validator.validate({ url: 'https://example.com/image.jpg', hasSpoiler: 1 }, mockArgs),
      ).toBe(false);
    });

    it('should return false for non-string, non-object values', () => {
      expect(validator.validate(123, mockArgs)).toBe(false);
      expect(validator.validate(true, mockArgs)).toBe(false);
      expect(validator.validate([], mockArgs)).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return correct error message', () => {
      expect(validator.defaultMessage(mockArgs)).toBe(
        'MediaInput must be a valid URL string or an object with url/fileId and optional hasSpoiler boolean',
      );
    });
  });
});

describe('IsMediaInputArrayConstraint', () => {
  let validator: IsMediaInputArrayConstraint;
  const mockArgs = {} as ValidationArguments;

  beforeEach(() => {
    validator = new IsMediaInputArrayConstraint();
  });

  describe('validate', () => {
    it('should return true for null/undefined (optional field)', () => {
      expect(validator.validate(null, mockArgs)).toBe(true);
      expect(validator.validate(undefined, mockArgs)).toBe(true);
    });

    it('should return true for array of valid URL strings', () => {
      expect(
        validator.validate(['https://example.com/1.jpg', 'https://example.com/2.jpg'], mockArgs),
      ).toBe(true);
    });

    it('should return true for array of valid objects', () => {
      expect(
        validator.validate(
          [
            { url: 'https://example.com/1.jpg' },
            { fileId: 'AgACAgIAAxkBAAIC...' },
            { url: 'https://example.com/3.jpg', hasSpoiler: true },
          ],
          mockArgs,
        ),
      ).toBe(true);
    });

    it('should return true for mixed array of strings and objects', () => {
      expect(
        validator.validate(
          [
            'https://example.com/1.jpg',
            { url: 'https://example.com/2.jpg' },
            { fileId: 'AgACAgIAAxkBAAIC...' },
          ],
          mockArgs,
        ),
      ).toBe(true);
    });

    it('should return true for empty array', () => {
      expect(validator.validate([], mockArgs)).toBe(true);
    });

    it('should return false for non-array', () => {
      expect(validator.validate('https://example.com/image.jpg', mockArgs)).toBe(false);
      expect(validator.validate({ url: 'https://example.com/image.jpg' }, mockArgs)).toBe(false);
    });

    it('should return false if any item is invalid', () => {
      expect(validator.validate(['https://example.com/1.jpg', 'not-a-url'], mockArgs)).toBe(false);
      expect(validator.validate(['https://example.com/1.jpg', {}], mockArgs)).toBe(false);
      expect(validator.validate(['https://example.com/1.jpg', 123], mockArgs)).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return correct error message', () => {
      expect(validator.defaultMessage(mockArgs)).toBe(
        'Each item in media array must be a valid URL string or an object with url/fileId and optional hasSpoiler boolean',
      );
    });
  });
});
