import { BadRequestException, Logger } from '@nestjs/common';
import { AppConfigService } from '../app-config/app-config.service.js';
import { ProviderRegistry } from '../providers/base/provider-registry.service.js';
import { AuthValidatorRegistry } from '../providers/base/auth-validator-registry.service.js';
import { IProvider } from '../providers/base/provider.interface.js';
import { PostRequestDto } from './dto/index.js';
import type { ChannelConfig } from '../app-config/interfaces/app-config.interface.js';

/**
 * Channel configuration with inline auth support
 */
export interface ResolvedChannelConfig extends ChannelConfig {
  /** Source of the config: 'channel' or 'inline' */
  source: 'channel' | 'inline';
}

/**
 * Base service with shared logic for PostService and PreviewService
 * Handles provider resolution, channel config, and auth validation
 */
export abstract class BasePostService {
  protected abstract readonly logger: Logger;

  constructor(
    protected readonly appConfig: AppConfigService,
    protected readonly providerRegistry: ProviderRegistry,
    protected readonly authValidatorRegistry: AuthValidatorRegistry,
  ) { }

  /**
   * Get provider instance by platform name
   * @param platform - Platform name (e.g., 'telegram')
   * @returns Provider instance
   * @throws BadRequestException if provider is not found
   */
  protected getProvider(platform: string): IProvider {
    return this.providerRegistry.get(platform);
  }

  /**
   * Get channel configuration from request
   * Supports both named channels from config and inline auth
   * @param request - Post request
   * @returns Channel configuration object with source indicator
   * @throws BadRequestException if neither channel nor auth is provided
   */
  protected getChannelConfig(request: PostRequestDto): ResolvedChannelConfig {
    if (request.channel) {
      const config = this.appConfig.getChannel(request.channel);
      return { ...config, source: 'channel' };
    }

    if (request.auth) {


      return {
        provider: request.platform.toLowerCase(),

        auth: request.auth,
        source: 'inline',
      };
    }

    throw new BadRequestException('Either "channel" or "auth" must be provided');
  }

  /**
   * Validate that platform matches channel provider
   * @param platform - Requested platform
   * @param channelConfig - Channel configuration
   * @throws BadRequestException if platform doesn't match
   */
  protected validatePlatformMatch(platform: string, channelConfig: ChannelConfig): void {
    if (String(channelConfig.provider).toLowerCase() !== platform.toLowerCase()) {
      throw new BadRequestException(
        `Channel provider "${channelConfig.provider}" does not match requested platform "${platform}"`,
      );
    }
  }

  /**
   * Validate auth object for the platform
   * @param platform - Platform name
   * @param auth - Auth object
   * @throws BadRequestException if auth is invalid
   */
  protected validateAuth(platform: string, auth: Record<string, any>): void {
    this.authValidatorRegistry.validate(platform, auth);
  }



  /**
   * Full validation chain for request
   * @param request - Post request
   * @returns Object with provider and channelConfig
   * @throws BadRequestException on validation failure
   */
  protected validateRequest(request: PostRequestDto): {
    provider: IProvider;
    channelConfig: ResolvedChannelConfig;
  } {
    const platform = request.platform?.toLowerCase();
    if (!platform) {
      throw new BadRequestException("Field 'platform' is required");
    }

    const provider = this.getProvider(platform);
    const channelConfig = this.getChannelConfig(request);

    this.validatePlatformMatch(platform, channelConfig);

    this.validateAuth(platform, channelConfig.auth);

    return { provider, channelConfig };
  }
}
