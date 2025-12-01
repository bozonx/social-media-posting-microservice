import { TelegramTypeDetector } from '@/modules/providers/telegram/telegram-type-detector.service';
import type { PostRequestDto } from '@/modules/post/dto';
import { PostType } from '@/common/enums';

describe('TelegramTypeDetector', () => {
  let detector: TelegramTypeDetector;

  beforeEach(() => {
    detector = new TelegramTypeDetector();
  });

  const baseRequest: PostRequestDto = {
    platform: 'telegram',
    body: 'Test body',
  };

  it('should return explicit type when not AUTO', () => {
    const request: PostRequestDto = {
      ...baseRequest,
      type: PostType.VIDEO,
      cover: 'https://example.com/image.jpg',
    };

    const result = detector.detectType(request);

    expect(result).toBe(PostType.VIDEO);
  });

  it('should detect ALBUM when media array is not empty', () => {
    const request: PostRequestDto = {
      ...baseRequest,
      type: PostType.AUTO,
      media: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
    };

    const result = detector.detectType(request);

    expect(result).toBe(PostType.ALBUM);
  });

  it('should detect DOCUMENT when document is present', () => {
    const request: PostRequestDto = {
      ...baseRequest,
      type: PostType.AUTO,
      document: 'https://example.com/file.pdf',
    };

    const result = detector.detectType(request);

    expect(result).toBe(PostType.DOCUMENT);
  });

  it('should detect AUDIO when audio is present', () => {
    const request: PostRequestDto = {
      ...baseRequest,
      type: PostType.AUTO,
      audio: 'https://example.com/audio.mp3',
    };

    const result = detector.detectType(request);

    expect(result).toBe(PostType.AUDIO);
  });

  it('should detect VIDEO when video is present', () => {
    const request: PostRequestDto = {
      ...baseRequest,
      type: PostType.AUTO,
      video: 'https://example.com/video.mp4',
    };

    const result = detector.detectType(request);

    expect(result).toBe(PostType.VIDEO);
  });

  it('should detect IMAGE when cover is present', () => {
    const request: PostRequestDto = {
      ...baseRequest,
      type: PostType.AUTO,
      cover: 'https://example.com/image.jpg',
    };

    const result = detector.detectType(request);

    expect(result).toBe(PostType.IMAGE);
  });

  it('should detect POST when no media fields are present', () => {
    const request: PostRequestDto = {
      ...baseRequest,
      type: PostType.AUTO,
    };

    const result = detector.detectType(request);

    expect(result).toBe(PostType.POST);
  });

  it('should respect priority: media over other fields', () => {
    const request: PostRequestDto = {
      ...baseRequest,
      type: PostType.AUTO,
      media: ['https://example.com/1.jpg'],
      document: 'https://example.com/file.pdf',
      audio: 'https://example.com/audio.mp3',
      video: 'https://example.com/video.mp4',
      cover: 'https://example.com/cover.jpg',
    };

    const result = detector.detectType(request);

    expect(result).toBe(PostType.ALBUM);
  });
});
