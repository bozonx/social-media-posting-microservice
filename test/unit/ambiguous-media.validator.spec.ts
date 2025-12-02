import { describe, it, expect } from '@jest/globals';
import { AmbiguousMediaValidator } from '@/common/validators/ambiguous-media.validator.js';
import type { PostRequestDto } from '@/modules/post/dto/index.js';
import { PostType } from '@/common/enums/index.js';

describe('AmbiguousMediaValidator', () => {
  const baseRequest: PostRequestDto = {
    platform: 'telegram',
    body: 'Test body',
  };

  it('should not throw when type is explicit and multiple media fields are present', () => {
    const request: PostRequestDto = {
      ...baseRequest,
      type: PostType.VIDEO,
      audio: 'https://example.com/audio.mp3',
      video: 'https://example.com/video.mp4',
      cover: 'https://example.com/image.jpg',
    };

    expect(() => AmbiguousMediaValidator.validate(request)).not.toThrow();
  });

  it('should not throw when only one media field is present for AUTO', () => {
    const request: PostRequestDto = {
      ...baseRequest,
      type: PostType.AUTO,
      audio: 'https://example.com/audio.mp3',
    };

    expect(() => AmbiguousMediaValidator.validate(request)).not.toThrow();
  });

  it('should not throw when media[] is present even if other fields are set', () => {
    const request: PostRequestDto = {
      ...baseRequest,
      type: PostType.AUTO,
      media: ['https://example.com/1.jpg'],
      audio: 'https://example.com/audio.mp3',
      video: 'https://example.com/video.mp4',
    };

    expect(() => AmbiguousMediaValidator.validate(request)).not.toThrow();
  });

  it('should throw when multiple media fields are present for AUTO', () => {
    const request: PostRequestDto = {
      ...baseRequest,
      type: PostType.AUTO,
      audio: 'https://example.com/audio.mp3',
      video: 'https://example.com/video.mp4',
    };

    expect(() => AmbiguousMediaValidator.validate(request)).toThrow(
      /Ambiguous media fields: cannot use 'audio' and 'video' together/,
    );
  });

  it('should treat undefined type as AUTO and enforce ambiguity rules', () => {
    const request: PostRequestDto = {
      ...baseRequest,
      audio: 'https://example.com/audio.mp3',
      cover: 'https://example.com/image.jpg',
    };

    expect(() => AmbiguousMediaValidator.validate(request)).toThrow(
      /Ambiguous media fields: cannot use 'audio' and 'cover' together/,
    );
  });

  it('should throw when document and video are present for AUTO', () => {
    const request: PostRequestDto = {
      ...baseRequest,
      type: PostType.AUTO,
      document: 'https://example.com/file.pdf',
      video: 'https://example.com/video.mp4',
    };

    expect(() => AmbiguousMediaValidator.validate(request)).toThrow(
      /Ambiguous media fields: cannot use 'document' and 'video' together/,
    );
  });

  it('should throw when document and cover are present for AUTO', () => {
    const request: PostRequestDto = {
      ...baseRequest,
      type: PostType.AUTO,
      document: 'https://example.com/file.pdf',
      cover: 'https://example.com/image.jpg',
    };

    expect(() => AmbiguousMediaValidator.validate(request)).toThrow(
      /Ambiguous media fields: cannot use 'document' and 'cover' together/,
    );
  });

  it('should throw when three media fields are present for AUTO', () => {
    const request: PostRequestDto = {
      ...baseRequest,
      type: PostType.AUTO,
      document: 'https://example.com/file.pdf',
      audio: 'https://example.com/audio.mp3',
      cover: 'https://example.com/image.jpg',
    };

    expect(() => AmbiguousMediaValidator.validate(request)).toThrow(/Ambiguous media fields/);
  });

  it('should not throw when no media fields are present', () => {
    const request: PostRequestDto = {
      ...baseRequest,
      type: PostType.AUTO,
    };

    expect(() => AmbiguousMediaValidator.validate(request)).not.toThrow();
  });

  it('should handle MediaInput objects correctly', () => {
    const request: PostRequestDto = {
      ...baseRequest,
      type: PostType.AUTO,
      audio: { url: 'https://example.com/audio.mp3' },
      video: { fileId: 'AgACAgIAAxkBAAIC...' },
    };

    expect(() => AmbiguousMediaValidator.validate(request)).toThrow(
      /Ambiguous media fields: cannot use 'audio' and 'video' together/,
    );
  });

  it('should not throw for single MediaInput object', () => {
    const request: PostRequestDto = {
      ...baseRequest,
      type: PostType.AUTO,
      cover: { url: 'https://example.com/image.jpg', hasSpoiler: true },
    };

    expect(() => AmbiguousMediaValidator.validate(request)).not.toThrow();
  });
});
