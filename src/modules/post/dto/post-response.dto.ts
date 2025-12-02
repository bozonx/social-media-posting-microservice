import type { PostType } from '../../../common/enums/index.js';

/**
 * Successful post publication response
 */
export interface PostResponseDto {
  success: true;
  data: {
    /** Platform-specific post ID */
    postId: string;
    /** Public URL to the post (if available) */
    url?: string;
    /** Platform name */
    platform: string;
    /** Actual post type used */
    type: PostType;
    /** Publication timestamp (ISO 8601) */
    publishedAt: string;
    /** Raw response from platform API */
    raw?: Record<string, any>;
    /** Unique request identifier for tracking */
    requestId: string;
  };
}

/**
 * Error response for failed post publication
 */
export interface ErrorResponseDto {
  success: false;
  error: {
    /** Error code for categorization */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Additional error details */
    details?: Record<string, any>;
    /** Raw error response from platform API */
    raw?: Record<string, any>;
    /** Unique request identifier for tracking */
    requestId: string;
  };
}
