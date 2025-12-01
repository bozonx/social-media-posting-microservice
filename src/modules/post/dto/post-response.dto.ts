import type { PostType } from '../../../common/enums';

export interface PostResponseDto {
  success: true;
  data: {
    postId: string;
    url?: string;
    platform: string;
    type: PostType;
    publishedAt: string;
    raw?: Record<string, any>;
    requestId: string;
  };
}

export interface ErrorResponseDto {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    raw?: Record<string, any>;
    requestId: string;
  };
}
