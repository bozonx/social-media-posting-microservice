import { MediaInput, MediaInputObject } from '../types/media-input.type';
import { InputFile } from 'grammy';

/**
 * Helper class for working with MediaInput
 */
export class MediaInputHelper {
    /**
     * Type guard to check if MediaInput is a string URL
     * @param input - MediaInput to check
     * @returns True if input is a string
     */
    static isString(input: MediaInput): input is string {
        return typeof input === 'string';
    }

    /**
     * Type guard to check if MediaInput is an object with url/fileId properties
     * @param input - MediaInput to check
     * @returns True if input is a MediaInputObject
     */
    static isObject(input: MediaInput): input is MediaInputObject {
        return typeof input === 'object' && input !== null;
    }

    /**
     * Extract URL from MediaInput
     * Handles both string URLs and object format with url property
     * @param input - MediaInput to extract URL from
     * @returns URL string if available, undefined otherwise
     */
    static getUrl(input: MediaInput): string | undefined {
        if (this.isString(input)) {
            return input;
        }
        if (this.isObject(input)) {
            return input.url;
        }
        return undefined;
    }

    /**
     * Extract Telegram file_id from MediaInput
     * Only available when MediaInput is in object format
     * @param input - MediaInput to extract file_id from
     * @returns Telegram file_id if available, undefined otherwise
     */
    static getFileId(input: MediaInput): string | undefined {
        if (this.isObject(input)) {
            return input.fileId;
        }
        return undefined;
    }

    /**
     * Extract hasSpoiler flag from MediaInput
     * Used for Telegram spoiler animation feature
     * @param input - MediaInput to extract flag from
     * @returns True if spoiler is enabled, false otherwise (defaults to false)
     */
    static getHasSpoiler(input: MediaInput): boolean {
        if (this.isObject(input)) {
            return input.hasSpoiler ?? false;
        }
        return false;
    }

    /**
     * Convert MediaInput to Telegram-compatible format
     * Prioritizes file_id over URL for better performance and reliability
     * @param input - MediaInput to convert
     * @returns Telegram file_id string or URL string
     * @throws Error if neither url nor fileId is provided
     */
    static toTelegramInput(input: MediaInput): string | InputFile {
        const fileId = this.getFileId(input);
        if (fileId) {
            return fileId;
        }

        const url = this.getUrl(input);
        if (url) {
            return url;
        }

        throw new Error('MediaInput must have either url or fileId');
    }

    /**
     * Check if MediaInput array is not empty
     * @param input - Optional array of MediaInput
     * @returns True if array exists and has at least one element
     */
    static isNotEmpty(input?: MediaInput[]): boolean {
        return Array.isArray(input) && input.length > 0;
    }

    /**
     * Check if MediaInput is defined and not null
     * @param input - Optional MediaInput to check
     * @returns True if input is defined and not null
     */
    static isDefined(input?: MediaInput): boolean {
        return input !== undefined && input !== null;
    }
}
