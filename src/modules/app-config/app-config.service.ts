import { Injectable } from '@nestjs/common';
import type { AccountConfig } from './interfaces/app-config.interface.js';

/**
 * Abstract configuration service
 * Defines the contract for configuration access
 */
@Injectable()
export abstract class AppConfigService {
  abstract get<T = any>(path: string): T | undefined;
  abstract getAccount(accountName: string): AccountConfig;
  abstract getAllAccounts(): Record<string, AccountConfig>;
  abstract get requestTimeoutSecs(): number;
  abstract get retryAttempts(): number;
  abstract get retryDelayMs(): number;
  abstract get idempotencyTtlMinutes(): number;
}
