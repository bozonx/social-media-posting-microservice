import { IsString, IsOptional, IsEnum, IsBoolean, IsObject, IsArray, IsUrl } from 'class-validator';
import { PostType, BodyFormat } from '../../../common/enums';

export class PostRequestDto {
  @IsString()
  platform!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;

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
  @IsUrl()
  cover?: string;

  @IsOptional()
  @IsUrl()
  video?: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  media?: string[];

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
