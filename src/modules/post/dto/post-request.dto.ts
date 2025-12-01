import { IsString, IsOptional, IsEnum, IsBoolean, IsObject, IsArray } from 'class-validator';
import { PostType, BodyFormat } from '../../../common/enums';
import { MediaInput } from '../../../common/types';
import { IsMediaInput, IsMediaInputArray } from '../../../common/validators/media-input.validator';

export class PostRequestDto {
  @IsString()
  platform!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsEnum(PostType)
  type?: PostType = PostType.AUTO;

  @IsOptional()
  @IsEnum(BodyFormat)
  bodyFormat?: BodyFormat;

  @IsOptional()
  @IsBoolean()
  convertBody?: boolean;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsMediaInput()
  cover?: MediaInput;

  @IsOptional()
  @IsMediaInput()
  video?: MediaInput;

  @IsOptional()
  @IsMediaInput()
  audio?: MediaInput;

  @IsOptional()
  @IsMediaInput()
  document?: MediaInput;

  @IsOptional()
  @IsMediaInputArray()
  media?: MediaInput[];

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsObject()
  auth?: Record<string, any>;

  @IsOptional()
  @IsObject()
  options?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  postLanguage?: string;

  @IsOptional()
  @IsEnum(['publish', 'draft', 'preview'])
  mode?: 'publish' | 'draft' | 'preview';

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
