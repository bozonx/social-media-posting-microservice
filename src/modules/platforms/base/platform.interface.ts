import type { PostType } from '../../../common/enums/index.js';
import type {
  PostRequestDto,
  PreviewResponseDto,
  PreviewErrorResponseDto,
} from '../../post/dto/index.js';
import type { AccountConfig } from '../../app-config/interfaces/app-config.interface.js';

/**
 * Response from platform after successful publication
 */
export interface PlatformPublishResponse {
  /** Platform-specific post ID */
  postId: string;
  /** Public URL to the post (if available) */
  url?: string;
  /** Raw response from platform API */
  raw?: Record<string, any>;
}

/**
 * Platform interface that all social media platforms must implement
 * Defines the contract for publishing and previewing posts
 */
export interface IPlatform {
  /** Platform name (e.g., 'telegram') */
  readonly name: string;
  /** List of supported post types */
  readonly supportedTypes: PostType[];
  /** Whether the platform supports cover image with other media (e.g. video cover) */
  readonly supportsCoverWithMedia?: boolean;

  /**
   * Publish a post to the platform
   * @param request - Post request data
   * @param accountConfig - Account configuration
   * @returns Publication result with post ID and URL
   */
  publish(request: PostRequestDto, accountConfig: any): Promise<PlatformPublishResponse>;

  /**
   * Preview a post without publishing
   * @param request - Post request data
   * @param accountConfig - Account configuration
   * @returns Preview result with validation and conversion details
   */
  preview(
    request: PostRequestDto,
    accountConfig: any,
  ): Promise<PreviewResponseDto | PreviewErrorResponseDto>;
}
