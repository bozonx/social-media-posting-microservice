/**
 * MediaInput type
 * Supports both string URL and object with additional parameters
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
