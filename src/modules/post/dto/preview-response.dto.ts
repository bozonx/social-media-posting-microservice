import type { PostType, BodyFormat } from '../../../common/enums';

export interface PreviewResponseDto {
  success: true;
  data: {
    valid: true;
    detectedType: PostType;
    convertedBody: string;
    targetFormat: BodyFormat;
    convertedBodyLength: number;
    warnings: string[];
  };
}

export interface PreviewErrorResponseDto {
  success: false;
  data: {
    valid: false;
    errors: string[];
    warnings: string[];
  };
}
