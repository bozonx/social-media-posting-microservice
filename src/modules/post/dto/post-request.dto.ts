import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  IsArray,
  MaxLength,
} from 'class-validator';
import { PostType, BodyFormat } from '../../../common/enums/index.js';
import type { MediaInput } from '../../../common/types/index.js';
import {
  IsMediaInput,
  IsMediaInputArray,
} from '../../../common/validators/media-input.validator.js';

/** Maximum body length in characters */
const MAX_BODY_LENGTH = 100_000;

/**
 * Post request DTO
 * Contains all data needed to publish a post to a social media platform
 */
export class PostRequestDto {
  /** Target social media platform (e.g., 'telegram') */
  @IsString()
  platform!: string;

  /** Post content/text body (max 100,000 characters) */
  @IsString()
  @MaxLength(MAX_BODY_LENGTH)
  body!: string;

  /** Post type (auto-detected if not specified) */
  @IsOptional()
  @IsEnum(PostType)
  type?: PostType = PostType.AUTO;

  /** Format of the body content (html, markdown, or text) */
  @IsOptional()
  @IsEnum(BodyFormat)
  bodyFormat?: BodyFormat = BodyFormat.TEXT;

  /** 
   * Whether to convert body to platform's preferred format 
   * @note Currently not used for Telegram (body is sent as-is)
   */
  @IsOptional()
  @IsBoolean()
  convertBodyDefault?: boolean;



  /** Post title (used by platforms that support it) */
  @IsOptional()
  @IsString()
  title?: string;

  /** Post description/summary (used by platforms that support it) */
  @IsOptional()
  @IsString()
  description?: string;

  /** Cover image (for image posts or article thumbnails) */
  @IsOptional()
  @IsMediaInput()
  cover?: MediaInput;

  /** Video file (for video posts) */
  @IsOptional()
  @IsMediaInput()
  video?: MediaInput;

  /** Audio file (for audio posts) */
  @IsOptional()
  @IsMediaInput()
  audio?: MediaInput;

  /** Document file (for document posts) */
  @IsOptional()
  @IsMediaInput()
  document?: MediaInput;

  /** Multiple media files (for album/gallery posts) */
  @IsOptional()
  @IsMediaInputArray()
  media?: MediaInput[];

  /** Named channel from configuration */
  @IsOptional()
  @IsString()
  channel?: string;

  /** Inline authentication credentials (alternative to channel) */
  @IsOptional()
  @IsObject()
  auth?: Record<string, any>;

  /** Whether inline auth is enabled (defaults to true) */
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  /** Platform-specific options */
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;

  /** Post tags/hashtags */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  /** Scheduled publication time (ISO 8601 format) */
  @IsOptional()
  @IsString()
  scheduledAt?: string;

  /** Post language code (e.g., 'en', 'ru') */
  @IsOptional()
  @IsString()
  postLanguage?: string;

  /** Publication mode: publish immediately or save as draft */
  @IsOptional()
  @IsEnum(['publish', 'draft'])
  mode?: 'publish' | 'draft';

  /** Idempotency key to prevent duplicate posts */
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
