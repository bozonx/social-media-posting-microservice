import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { YAML_CONFIG_NAMESPACE } from '@config/yaml.config';
import type { AppConfig, ChannelConfig } from './interfaces/app-config.interface';

@Injectable()
export class AppConfigService {
  private readonly config: AppConfig;

  constructor(private readonly configService: ConfigService) {
    const loadedConfig = this.configService.get<AppConfig>(YAML_CONFIG_NAMESPACE);

    if (!loadedConfig) {
      throw new Error(`Configuration section "${YAML_CONFIG_NAMESPACE}" is not loaded`);
    }

    this.config = loadedConfig;
  }

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

  getChannel(channelName: string): ChannelConfig {
    const channel = this.config.channels?.[channelName];
    if (!channel) {
      throw new Error(`Channel "${channelName}" not found in config`);
    }
    if (!channel.enabled) {
      throw new Error(`Channel "${channelName}" is disabled`);
    }
    return channel;
  }

  getAllChannels(): AppConfig['channels'] {
    return this.config.channels || {};
  }

  getCommonConfig(): AppConfig['common'] {
    return this.config.common;
  }

  getConversionConfig(): AppConfig['conversion'] {
    return this.config.conversion;
  }
}
