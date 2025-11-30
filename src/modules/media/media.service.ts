import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class MediaService {
    validateMediaUrl(url: string): void {
        if (!url) {
            return;
        }

        try {
            const parsedUrl = new URL(url);

            // Проверяем протокол
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

    validateMediaUrls(urls: string[]): void {
        if (!urls || urls.length === 0) {
            return;
        }

        urls.forEach((url) => this.validateMediaUrl(url));
    }
}
