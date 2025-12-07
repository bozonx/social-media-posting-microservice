import type { PostType } from '../../../common/enums/index.js';

/**
 * Successful preview response
 */
export interface PreviewResponseDto {
  success: true;
  data: {
    valid: true;
    /** Detected post type based on content */
    detectedType: PostType;
    /** Body content after conversion */
    convertedBody: string;
    /** Target format after conversion */
    targetFormat: string;
    /** Length of converted body */
    convertedBodyLength: number;
    /** Validation warnings (non-blocking) */
    warnings: string[];
  };
}

/**
 * Preview error response for invalid requests
 */
export interface PreviewErrorResponseDto {
  success: false;
  data: {
    valid: false;
    /** Validation errors (blocking) */
    errors: string[];
    /** Validation warnings (non-blocking) */
    warnings: string[];
  };
}
