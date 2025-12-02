import { Injectable, BadRequestException } from '@nestjs/common';
import { PostRequestDto, PreviewResponseDto, PreviewErrorResponseDto } from './dto/index.js';
import { AppConfigService } from '../app-config/app-config.service.js';
import { TelegramProvider } from '../providers/telegram/telegram.provider.js';
import { IProvider } from '../providers/base/provider.interface.js';

@Injectable()
export class PreviewService {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly telegramProvider: TelegramProvider,
  ) {}

  /**
   * Preview a post without actually publishing it
   * Validates the request and returns converted content with warnings
   * @param request - Post request to preview
   * @returns Preview response with validation results or error response
   */
  async preview(request: PostRequestDto): Promise<PreviewResponseDto | PreviewErrorResponseDto> {
    // Validate platform
    const platform = request.platform?.toLowerCase();
    if (!platform) {
      return this.createErrorResponse(["Field 'platform' is required"]);
    }

    // Get Provider
    let provider: IProvider;
    try {
      provider = this.getProvider(platform);
    } catch (e: any) {
      return this.createErrorResponse([e.message]);
    }

    // Get Channel Config
    let channelConfig: any;
    try {
      channelConfig = this.getChannelConfig(request);
    } catch (e: any) {
      return this.createErrorResponse([e.message]);
    }

    // Validate Provider matches Channel
    if (channelConfig.provider !== platform) {
      return this.createErrorResponse([
        `Channel provider '${channelConfig.provider}' does not match requested platform '${platform}'`,
      ]);
    }

    // Delegate to provider
    return provider.preview(request, channelConfig);
  }

  /**
   * Get provider instance by platform name
   * @param platform - Platform name
   * @returns Provider instance
   * @throws BadRequestException if platform is not supported
   */
  private getProvider(platform: string): IProvider {
    switch (platform.toLowerCase()) {
      case 'telegram':
        return this.telegramProvider;
      default:
        throw new BadRequestException(`Provider "${platform}" is not supported`);
    }
  }

  /**
   * Get channel configuration from request
   * Supports both named channels and inline auth
   * @param request - Post request
   * @returns Channel configuration
   * @throws BadRequestException if channel not found or auth missing
   */
  private getChannelConfig(request: PostRequestDto): any {
    if (request.channel) {
      try {
        return this.appConfig.getChannel(request.channel);
      } catch {
        throw new BadRequestException(`Channel '${request.channel}' not found in configuration`);
      }
    }

    if (request.auth) {
      return {
        provider: request.platform,
        enabled: true,
        auth: request.auth,
      };
    }

    throw new BadRequestException("Either 'channel' or 'auth' must be provided");
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
