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
}
