import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { YAML_CONFIG_NAMESPACE } from '../../config/yaml.config.js';
import type { AppConfig, AccountConfig } from './interfaces/app-config.interface.js';

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
   * Get a specific account configuration by name
   * @param accountName - Name of the account from config
   * @returns Account configuration object
   * @throws NotFoundException if account is not found
   */
  getAccount(accountName: string): AccountConfig {
    const account = this.config.accounts?.[accountName];
    if (!account) {
      throw new NotFoundException(`Account "${accountName}" not found in configuration`);
    }
    return account;
  }

  /**
   * Get all configured accounts
   * @returns Record of all accounts indexed by name
   */
  getAllAccounts(): AppConfig['accounts'] {
    return this.config.accounts || {};
  }

  /**
   * Get incoming request timeout
   */
  get requestTimeoutSecs(): number {
    return this.config.requestTimeoutSecs;
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
}
