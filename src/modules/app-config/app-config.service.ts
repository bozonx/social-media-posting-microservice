import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { YAML_CONFIG_NAMESPACE } from '../../config/yaml.config.js';
import type { AppConfig, ChannelConfig } from './interfaces/app-config.interface.js';

@Injectable()
export class AppConfigService {
  private readonly config: AppConfig;

  /**
   * Initializes the service and loads YAML configuration
   * @param configService - NestJS ConfigService for accessing configuration
   * @throws Error if YAML configuration section is not loaded
   */
  constructor(private readonly configService: ConfigService) {
    const loadedConfig = this.configService.get<AppConfig>(YAML_CONFIG_NAMESPACE);

    if (!loadedConfig) {
      throw new Error(`Configuration section "${YAML_CONFIG_NAMESPACE}" is not loaded`);
    }

    this.config = loadedConfig;
  }

  /**
   * Get configuration value by dot-notation path
   * @param path - Dot-separated path to configuration value (e.g., 'common.retryAttempts')
   * @returns Configuration value or undefined if not found
   * @example
   * const retries = appConfig.get<number>('common.retryAttempts');
   */
  get<T = any>(path: string): T | undefined {
    const keys = path.split('.');
    let value: any = this.config;

    for (const key of keys) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[key];
    }

    return value as T;
  }

  /**
   * Get channel configuration by name
   * @param channelName - Name of the channel as defined in config.yaml
   * @returns Channel configuration object
   * @throws Error if channel is not found or is disabled
   */
  getChannel(channelName: string): ChannelConfig {
    const channel = this.config.channels?.[channelName];
    if (!channel) {
      throw new Error(`Channel "${channelName}" not found in config`);
    }

    return channel;
  }

  /**
   * Get all configured channels
   * @returns Record of all channels indexed by name
   */
  getAllChannels(): AppConfig['channels'] {
    return this.config.channels || {};
  }

  /**
   * Get provider connection timeout
   */
  get providerTimeoutSecs(): number | undefined {
    return this.config.providerTimeoutSecs;
  }

  /**
   * Get incoming request timeout
   */
  get incomingRequestTimeoutSecs(): number {
    return this.config.incomingRequestTimeoutSecs;
  }

  /**
   * Get default body conversion setting
   */
  get convertBodyDefault(): boolean {
    return this.config.convertBodyDefault;
  }

  /**
   * Get retry attempts
   */
  get retryAttempts(): number {
    return this.config.retryAttempts;
  }

  /**
   * Get retry delay in milliseconds
   */
  get retryDelayMs(): number {
    return this.config.retryDelayMs;
  }

  /**
   * Get idempotency TTL in minutes
   */
  get idempotencyTtlMinutes(): number {
    return this.config.idempotencyTtlMinutes;
  }

  /**
   * Get conversion configuration section
   * @returns Conversion settings for body format transformations
   */
  getConversionConfig(): AppConfig['conversion'] {
    return this.config.conversion;
  }
}
