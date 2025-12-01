import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { AppConfig } from './interfaces/app-config.interface';

@Injectable()
export class AppConfigService implements OnModuleInit {
  private config!: AppConfig;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const configPath = this.configService.get<string>('CONFIG_PATH') || './config.yaml';

    try {
      const fileContent = readFileSync(configPath, 'utf8');
      const rawConfig = yaml.load(fileContent) as AppConfig;

      // Подстановка переменных окружения
      this.config = this.substituteEnvVariables(rawConfig);
    } catch (error: any) {
      throw new Error(`Failed to load config from ${configPath}: ${error.message}`);
    }
  }

  private substituteEnvVariables(obj: any): any {
    if (typeof obj === 'string') {
      // Заменяем ${VAR_NAME} на значение из process.env
      return obj.replace(/\$\{([^}]+)\}/g, (_, varName) => {
        const value = process.env[varName];
        if (value === undefined) {
          throw new Error(`Environment variable ${varName} is not defined`);
        }
        return value;
      });
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.substituteEnvVariables(item));
    }

    if (obj !== null && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.substituteEnvVariables(value);
      }
      return result;
    }

    return obj;
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

  getChannel(channelName: string) {
    const channel = this.config.channels?.[channelName];
    if (!channel) {
      throw new Error(`Channel "${channelName}" not found in config`);
    }
    if (!channel.enabled) {
      throw new Error(`Channel "${channelName}" is disabled`);
    }
    return channel;
  }

  getAllChannels() {
    return this.config.channels || {};
  }

  getCommonConfig() {
    return this.config.common;
  }

  getConversionConfig() {
    return this.config.conversion;
  }
}
