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

    it('should return true for file_id string (non-URL)', () => {
      expect(validator.validate('AgACAgIAAxkBAAIC...', mockArgs)).toBe(true);
      expect(validator.validate('BAACAgIAAxkBAAIC...', mockArgs)).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(validator.validate('', mockArgs)).toBe(false);
      expect(validator.validate('   ', mockArgs)).toBe(false);
    });

    it('should return true for object with src (url)', () => {
      expect(validator.validate({ src: 'https://example.com/image.jpg' }, mockArgs)).toBe(true);
    });

    it('should return true for object with src (fileId)', () => {
      expect(validator.validate({ src: 'AgACAgIAAxkBAAIC...' }, mockArgs)).toBe(true);
    });

    it('should return true for object with hasSpoiler boolean', () => {
      expect(
        validator.validate({ src: 'https://example.com/image.jpg', hasSpoiler: true }, mockArgs),
      ).toBe(true);
      expect(
        validator.validate({ src: 'https://example.com/image.jpg', hasSpoiler: false }, mockArgs),
      ).toBe(true);
    });

    it('should return false for object without src', () => {
      expect(validator.validate({}, mockArgs)).toBe(false);
      expect(validator.validate({ hasSpoiler: true }, mockArgs)).toBe(false);
    });

    it('should return false for object with non-boolean hasSpoiler', () => {
      expect(
        validator.validate({ src: 'https://example.com/image.jpg', hasSpoiler: 'true' }, mockArgs),
      ).toBe(false);
      expect(
        validator.validate({ src: 'https://example.com/image.jpg', hasSpoiler: 1 }, mockArgs),
      ).toBe(false);
    });

    it('should return false for non-string, non-object values', () => {
      expect(validator.validate(123, mockArgs)).toBe(false);
      expect(validator.validate(true, mockArgs)).toBe(false);
      expect(validator.validate([], mockArgs)).toBe(false);
    });

    it('should return false for strings exceeding max length (500 chars)', () => {
      const longString = 'a'.repeat(501);
      expect(validator.validate(longString, mockArgs)).toBe(false);
    });

    it('should return true for strings at max length (500 chars)', () => {
      const maxLengthString = 'a'.repeat(500);
      expect(validator.validate(maxLengthString, mockArgs)).toBe(true);
    });

    it('should return false for object with src exceeding max length', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(500);
      expect(validator.validate({ src: longUrl }, mockArgs)).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return correct error message', () => {
      expect(validator.defaultMessage(mockArgs)).toBe(
        'MediaInput must be a string (URL or file_id, max 500 characters) or an object with src (max 500 characters) and optional hasSpoiler boolean',
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
            { src: 'https://example.com/1.jpg' },
            { src: 'AgACAgIAAxkBAAIC...' },
            { src: 'https://example.com/3.jpg', hasSpoiler: true },
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
            { src: 'https://example.com/2.jpg' },
            { src: 'AgACAgIAAxkBAAIC...' },
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
      expect(validator.validate({ src: 'https://example.com/image.jpg' }, mockArgs)).toBe(false);
    });

    it('should return true for array with file_id strings', () => {
      expect(validator.validate(['https://example.com/1.jpg', 'AgACAgIAAxkBAAIC...'], mockArgs)).toBe(true);
      expect(validator.validate(['AgACAgIAAxkBAAIC...', 'BAACAgIAAxkBAAIC...'], mockArgs)).toBe(true);
    });

    it('should return false if success is invalid', () => {
      expect(validator.validate(['https://example.com/1.jpg', ''], mockArgs)).toBe(false);
      expect(validator.validate(['https://example.com/1.jpg', {}], mockArgs)).toBe(false);
      expect(validator.validate(['https://example.com/1.jpg', 123], mockArgs)).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return correct error message', () => {
      expect(validator.defaultMessage(mockArgs)).toBe(
        'Each item in media array must be a string (URL or file_id, max 500 characters) or an object with src (max 500 characters) and optional hasSpoiler boolean',
      );
    });
  });
});
