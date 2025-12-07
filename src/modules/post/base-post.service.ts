import { BadRequestException, Logger } from '@nestjs/common';
import { AppConfigService } from '../app-config/app-config.service.js';
import { PlatformRegistry } from '../platforms/base/platform-registry.service.js';
import { AuthValidatorRegistry } from '../platforms/base/auth-validator-registry.service.js';
import { IPlatform } from '../platforms/base/platform.interface.js';
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
 * Handles platform resolution, channel config, and auth validation
 */
export abstract class BasePostService {
  protected abstract readonly logger: Logger;

  constructor(
    protected readonly appConfig: AppConfigService,
    protected readonly platformRegistry: PlatformRegistry,
    protected readonly authValidatorRegistry: AuthValidatorRegistry,
  ) { }

  /**
   * Get platform instance by name
   * @param platformName - Platform name (e.g., 'telegram')
   * @returns Platform instance
   * @throws BadRequestException if platform is not found
   */
  protected getPlatform(platformName: string): IPlatform {
    return this.platformRegistry.get(platformName);
  }

  /**
   * Get channel configuration from request
   * Supports both named channels from config and inline auth
   * @param request - Post request
   * @returns Channel configuration object with source indicator
   * @throws BadRequestException if neither channel nor auth is provided
   */
  protected getChannelConfig(request: PostRequestDto): ResolvedChannelConfig {
    // Get base config from channel or create inline config
    let baseConfig: ChannelConfig;
    let source: 'channel' | 'inline';

    if (request.channel) {
      baseConfig = this.appConfig.getChannel(request.channel);
      source = 'channel';
    } else if (request.auth) {
      // Create inline config with auth from request
      baseConfig = {
        platform: request.platform.toLowerCase(),
        auth: {},
      };
      source = 'inline';
    } else {
      throw new BadRequestException('Either "channel" or "auth" must be provided');
    }

    // Merge auth: request.auth fields override channel auth fields
    const mergedAuth = {
      ...baseConfig.auth,
      ...(request.auth || {}),
    };

    return {
      ...baseConfig,
      auth: mergedAuth,
      source,
    };
  }

  /**
   * Validate that platform matches channel platform
   * @param platformName - Requested platform
   * @param channelConfig - Channel configuration
   * @throws BadRequestException if platform doesn't match
   */
  protected validatePlatformMatch(platformName: string, channelConfig: ChannelConfig): void {
    if (String(channelConfig.platform).toLowerCase() !== platformName.toLowerCase()) {
      throw new BadRequestException(
        `Channel platform "${channelConfig.platform}" does not match requested platform "${platformName}"`,
      );
    }
  }

  /**
   * Validate auth object for the platform
   * @param platformName - Platform name
   * @param auth - Auth object
   * @throws BadRequestException if auth is invalid
   */
  protected validateAuth(platformName: string, auth: Record<string, any>): void {
    this.authValidatorRegistry.validate(platformName, auth);
  }



  /**
   * Full validation chain for request
   * @param request - Post request
   * @returns Object with platform and channelConfig
   * @throws BadRequestException on validation failure
   */
  protected validateRequest(request: PostRequestDto): {
    platform: IPlatform;
    channelConfig: ResolvedChannelConfig;
  } {
    const platformName = request.platform?.toLowerCase();
    if (!platformName) {
      throw new BadRequestException("Field 'platform' is required");
    }

    const platform = this.getPlatform(platformName);
    const channelConfig = this.getChannelConfig(request);

    this.validatePlatformMatch(platformName, channelConfig);

    this.validateAuth(platformName, channelConfig.auth);

    return { platform, channelConfig };
  }
}
