import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PostRequestDto, PostResponseDto, ErrorResponseDto } from './dto';
import { PostType } from '../../common/enums';
import { AppConfigService } from '../app-config/app-config.service';
import { TelegramProvider } from '../providers/telegram/telegram.provider';

@Injectable()
export class PostService {
    private readonly logger = new Logger(PostService.name);

    constructor(
        private readonly appConfig: AppConfigService,
        private readonly telegramProvider: TelegramProvider,
    ) { }

    async publish(
        request: PostRequestDto,
    ): Promise<PostResponseDto | ErrorResponseDto> {
        const requestId = randomUUID();

        try {
            // Получаем конфигурацию канала
            let channelConfig: any;

            if (request.channel) {
                channelConfig = this.appConfig.getChannel(request.channel);
            } else if (request.auth) {
                // Используем auth из запроса
                channelConfig = {
                    provider: request.platform,
                    enabled: true,
                    auth: request.auth,
                };
            } else {
                throw new BadRequestException(
                    'Either "channel" or "auth" must be provided',
                );
            }

            // Проверяем соответствие провайдера
            if (channelConfig.provider !== request.platform) {
                throw new BadRequestException(
                    `Channel provider "${channelConfig.provider}" does not match requested platform "${request.platform}"`,
                );
            }

            // Получаем провайдера
            const provider = this.getProvider(request.platform);

            // Проверяем поддержку типа поста
            const postType = request.type || PostType.POST;
            if (!provider.supportedTypes.includes(postType)) {
                throw new BadRequestException(
                    `Post type "${postType}" is not supported by ${request.platform}`,
                );
            }

            // Публикуем
            this.logger.log(
                `Publishing to ${request.platform} via ${request.channel || 'inline auth'}, type: ${postType}`,
            );

            const result = await this.retryWithJitter(
                () => provider.publish(request, channelConfig),
                this.appConfig.getCommonConfig().retryAttempts,
                this.appConfig.getCommonConfig().retryDelayMs,
            );

            const response: PostResponseDto = {
                success: true,
                data: {
                    postId: result.postId,
                    url: result.url,
                    platform: request.platform,
                    type: postType,
                    publishedAt: new Date().toISOString(),
                    raw: result.raw,
                    requestId,
                },
            };

            return response;
        } catch (error: any) {
            this.logger.error(
                `Failed to publish to ${request.platform}: ${error.message}`,
                error.stack,
            );

            const errorResponse: ErrorResponseDto = {
                success: false,
                error: {
                    code: this.getErrorCode(error),
                    message: error.message,
                    details: error.response?.data,
                    raw: error.response,
                    requestId,
                },
            };

            return errorResponse;
        }
    }

    private getProvider(platform: string) {
        switch (platform.toLowerCase()) {
            case 'telegram':
                return this.telegramProvider;
            default:
                throw new BadRequestException(`Provider "${platform}" is not supported`);
        }
    }

    private getErrorCode(error: any): string {
        if (error instanceof BadRequestException) {
            return 'VALIDATION_ERROR';
        }
        if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
            return 'TIMEOUT_ERROR';
        }
        if (error.response?.status === 429) {
            return 'RATE_LIMIT_ERROR';
        }
        if (error.response?.status >= 500) {
            return 'PLATFORM_ERROR';
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
            return 'AUTH_ERROR';
        }
        return 'PLATFORM_ERROR';
    }

    private async retryWithJitter<T>(
        fn: () => Promise<T>,
        maxAttempts: number,
        baseDelayMs: number,
    ): Promise<T> {
        let lastError: any;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error: any) {
                lastError = error;

                // Не делаем retry для ошибок валидации
                if (error instanceof BadRequestException) {
                    throw error;
                }

                // Не делаем retry на последней попытке
                if (attempt === maxAttempts) {
                    break;
                }

                // Retry только для временных ошибок
                const shouldRetry = this.shouldRetry(error);
                if (!shouldRetry) {
                    throw error;
                }

                // Вычисляем задержку с jitter ±20%
                const jitter = 0.8 + Math.random() * 0.4; // random(0.8, 1.2)
                const delay = Math.floor(baseDelayMs * jitter * attempt);

                this.logger.warn(
                    `Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms: ${(error as any).message}`,
                );

                await this.sleep(delay);
            }
        }

        throw lastError;
    }

    private shouldRetry(error: any): boolean {
        // Retry для сетевых ошибок
        if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
            return true;
        }

        // Retry для 5xx ошибок
        if (error.response?.status >= 500) {
            return true;
        }

        // Retry для rate limit
        if (error.response?.status === 429) {
            return true;
        }

        return false;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
