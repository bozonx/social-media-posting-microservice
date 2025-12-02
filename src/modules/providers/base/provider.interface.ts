import type { PostType } from '../../../common/enums/index.js';
import type {
  PostRequestDto,
  PreviewResponseDto,
  PreviewErrorResponseDto,
} from '../../post/dto/index.js';

/**
 * Response from provider after successful publication
 */
export interface ProviderPublishResponse {
  /** Platform-specific post ID */
  postId: string;
  /** Public URL to the post (if available) */
  url?: string;
  /** Raw response from platform API */
  raw?: Record<string, any>;
}

/**
 * Provider interface that all platform providers must implement
 * Defines the contract for publishing and previewing posts
 */
export interface IProvider {
  /** Provider name (e.g., 'telegram') */
  readonly name: string;
  /** List of supported post types */
  readonly supportedTypes: PostType[];

  /**
   * Publish a post to the platform
   * @param request - Post request data
   * @param channelConfig - Channel configuration
   * @returns Publication result with post ID and URL
   */
  publish(request: PostRequestDto, channelConfig: any): Promise<ProviderPublishResponse>;

  /**
   * Preview a post without publishing
   * @param request - Post request data
   * @param channelConfig - Channel configuration
   * @returns Preview result with validation and conversion details
   */
  preview(
    request: PostRequestDto,
    channelConfig: any,
  ): Promise<PreviewResponseDto | PreviewErrorResponseDto>;
}
