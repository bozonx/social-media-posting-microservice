import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class MediaService {
  /**
   * Validate a single media URL
   * Ensures the URL is well-formed and uses HTTP/HTTPS protocol
   * @param url - URL to validate
   * @throws BadRequestException if URL is invalid or uses unsupported protocol
   */
  validateMediaUrl(url: string): void {
    if (!url) {
      return;
    }

    try {
      const parsedUrl = new URL(url);

      // Only HTTP and HTTPS protocols are allowed
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new BadRequestException(
          `Invalid media URL protocol: ${parsedUrl.protocol}. Only HTTP and HTTPS are allowed.`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Invalid media URL format: ${url}`);
    }
  }

  /**
   * Validate multiple media URLs
   * @param urls - Array of URLs to validate
   * @throws BadRequestException if any URL is invalid
   */
  validateMediaUrls(urls: string[]): void {
    if (!urls || urls.length === 0) {
      return;
    }

    urls.forEach(url => this.validateMediaUrl(url));
  }
}
