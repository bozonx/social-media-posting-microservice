/**
 * Media type for explicit type specification in media arrays
 * Used in albums to avoid auto-detection by URL extension
 */
export type MediaType = 'image' | 'video' | 'audio' | 'document';

/**
 * MediaInput type
 * Supports:
 * - String: URL or Telegram file_id
 * - Object: With url/fileId and optional parameters
 */
export type MediaInput = string | MediaInputObject;

export interface MediaInputObject {
  /**
   * URL of the media file
   */
  url?: string;

  /**
   * Telegram file_id for reusing already uploaded files
   */
  fileId?: string;

  /**
   * Hide media with spoiler animation (for shocking content)
   * Supported by Telegram Bot API 5.6+
   */
  hasSpoiler?: boolean;

  /**
   * Explicit media type specification
   * For single media fields (cover, video, audio, document) this is ignored
   * For media[] arrays this overrides auto-detection by URL extension
   */
  type?: MediaType;
}
