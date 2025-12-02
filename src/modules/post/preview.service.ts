import { Injectable, Logger } from '@nestjs/common';
import { PostRequestDto, PreviewResponseDto, PreviewErrorResponseDto } from './dto/index.js';
import { AppConfigService } from '../app-config/app-config.service.js';
import { ProviderRegistry } from '../providers/base/provider-registry.service.js';
import { AuthValidatorRegistry } from '../providers/base/auth-validator-registry.service.js';
import { BasePostService } from './base-post.service.js';

@Injectable()
export class PreviewService extends BasePostService {
  protected readonly logger = new Logger(PreviewService.name);

  constructor(
    appConfig: AppConfigService,
    providerRegistry: ProviderRegistry,
    authValidatorRegistry: AuthValidatorRegistry,
  ) {
    super(appConfig, providerRegistry, authValidatorRegistry);
  }

  /**
   * Preview a post without actually publishing it
   * Validates the request and returns converted content with warnings
   * @param request - Post request to preview
   * @returns Preview response with validation results or error response
   */
  async preview(request: PostRequestDto): Promise<PreviewResponseDto | PreviewErrorResponseDto> {
    try {
      const { provider, channelConfig } = this.validateRequest(request);

      // Delegate to provider
      return await provider.preview(request, channelConfig);
    } catch (error: any) {
      // Log error with full stack trace for debugging
      this.logger.warn({
        message: `Preview validation failed: ${error?.message ?? 'Unknown error'}`,
        metadata: {
          platform: request.platform,
          channel: request.channel,
        },
        err: error,
      });

      return this.createErrorResponse([error.message]);
    }
  }

  /**
   * Create error response for preview failures
   * @param errors - List of error messages
   * @returns Preview error response
   */
  private createErrorResponse(errors: string[]): PreviewErrorResponseDto {
    return {
      success: false,
      data: {
        valid: false,
        errors,
        warnings: [],
      },
    };
  }
}
