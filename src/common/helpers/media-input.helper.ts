import { MediaInput, MediaInputObject, MediaType } from '../types/media-input.type.js';
import { InputFile } from 'grammy';

/**
 * Helper class for working with MediaInput
 */
export class MediaInputHelper {
  /**
   * Check if a string is a valid URL
   * @param str - String to check
   * @returns True if string is a valid URL
   */
  private static isValidUrl(str: string): boolean {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Type guard to check if MediaInput is a string URL or file_id
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
   * If input is a string, checks if it's a valid URL
   * @param input - MediaInput to extract URL from
   * @returns URL string if available, undefined otherwise
   */
  static getUrl(input: MediaInput): string | undefined {
    if (this.isString(input)) {
      // Only return as URL if it's a valid URL format
      return this.isValidUrl(input) ? input : undefined;
    }
    if (this.isObject(input)) {
      return input.url;
    }
    return undefined;
  }

  /**
   * Extract Telegram file_id from MediaInput
   * Available when MediaInput is in object format or a non-URL string
   * @param input - MediaInput to extract file_id from
   * @returns Telegram file_id if available, undefined otherwise
   */
  static getFileId(input: MediaInput): string | undefined {
    if (this.isString(input)) {
      // If it's not a valid URL, treat it as file_id
      return this.isValidUrl(input) ? undefined : input;
    }
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
   * Extract explicit media type from MediaInput
   * Used in media arrays to override auto-detection by URL extension
   * @param input - MediaInput to extract type from
   * @returns MediaType if specified, undefined otherwise
   */
  static getType(input: MediaInput): MediaType | undefined {
    if (this.isObject(input)) {
      return input.type;
    }
    return undefined;
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
   * Check if input has valid MediaInput structure
   * @param input - Input to check
   * @returns True if input is a string or object with url/fileId
   */
  static isValidShape(input: any): boolean {
    if (this.isString(input)) {
      return true;
    }
    if (typeof input === 'object' && input !== null) {
      const hasUrl = typeof input.url === 'string';
      const hasFileId = typeof input.fileId === 'string';
      return hasUrl || hasFileId;
    }
    return false;
  }

  /**
   * Sanitize media input
   * @param input - Input to sanitize
   * @returns MediaInput if valid, undefined otherwise
   */
  static sanitize(input: any): MediaInput | undefined {
    if (this.isValidShape(input)) {
      return input;
    }
    return undefined;
  }

  /**
   * Sanitize media input array
   * @param input - Input array to sanitize
   * @returns Array of valid MediaInput items or undefined if empty/invalid
   */
  static sanitizeArray(input: any): MediaInput[] | undefined {
    if (!Array.isArray(input)) {
      return undefined;
    }
    const validItems = input.filter(item => this.isValidShape(item));
    return validItems.length > 0 ? validItems : undefined;
  }

  /**
   * Check if MediaInput array is not empty and contains valid items
   * @param input - Optional array of MediaInput
   * @returns True if array exists and has at least one valid element
   */
  static isNotEmpty(input?: MediaInput[]): boolean {
    return Array.isArray(input) && input.some(item => this.isValidShape(item));
  }

  /**
   * Check if MediaInput is defined, not null, and has valid shape
   * @param input - Optional MediaInput to check
   * @returns True if input is defined, not null, and valid
   */
  static isDefined(input?: MediaInput): boolean {
    return input !== undefined && input !== null && this.isValidShape(input);
  }
}
