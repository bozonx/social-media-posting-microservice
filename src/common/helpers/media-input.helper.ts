import { MediaInput, MediaInputObject } from '../types/media-input.type';
import { InputFile } from 'grammy';

/**
 * Helper class for working with MediaInput
 */
export class MediaInputHelper {
    /**
     * Check if MediaInput is a string URL
     */
    static isString(input: MediaInput): input is string {
        return typeof input === 'string';
    }

    /**
     * Check if MediaInput is an object
     */
    static isObject(input: MediaInput): input is MediaInputObject {
        return typeof input === 'object' && input !== null;
    }

    /**
     * Get URL from MediaInput (if available)
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
     * Get file_id from MediaInput (if available)
     */
    static getFileId(input: MediaInput): string | undefined {
        if (this.isObject(input)) {
            return input.fileId;
        }
        return undefined;
    }

    /**
     * Get hasSpoiler flag from MediaInput
     */
    static getHasSpoiler(input: MediaInput): boolean {
        if (this.isObject(input)) {
            return input.hasSpoiler ?? false;
        }
        return false;
    }

    /**
     * Convert MediaInput to Telegram InputFile or string
     * Returns file_id if available, otherwise URL
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
     */
    static isNotEmpty(input?: MediaInput[]): boolean {
        return Array.isArray(input) && input.length > 0;
    }

    /**
     * Check if MediaInput is defined
     */
    static isDefined(input?: MediaInput): boolean {
        return input !== undefined && input !== null;
    }
}
