/**
 * Library mode factory
 * Provides standalone initialization without NestJS HTTP server
 */

import { Logger as NestLogger } from '@nestjs/common';
import { PostService } from './modules/post/post.service.js';
import { PreviewService } from './modules/post/preview.service.js';
import { PlatformRegistry } from './modules/platforms/base/platform-registry.service.js';
import { AuthValidatorRegistry } from './modules/platforms/base/auth-validator-registry.service.js';
import { IdempotencyService } from './modules/post/idempotency.service.js';
import { ShutdownService } from './common/services/shutdown.service.js';
import type { PostRequestDto, PostResponseDto, ErrorResponseDto } from './modules/post/dto/index.js';
import type { PreviewResponseDto, PreviewErrorResponseDto } from './modules/post/dto/index.js';
import type { AccountConfig } from './modules/app-config/interfaces/app-config.interface.js';

/**
 * Configuration for library mode
 */
export interface LibraryConfig {
  /** Named account configurations */
  accounts: Record<string, AccountConfig>;
  /** Request timeout in seconds (default: 60) */
  requestTimeoutSecs?: number;
  /** Number of retry attempts on error (default: 3) */
  retryAttempts?: number;
  /** Delay between retry attempts in milliseconds (default: 1000) */
  retryDelayMs?: number;
  /** Time-to-live for idempotency records in minutes (default: 10) */
  idempotencyTtlMinutes?: number;
  /** Log level (default: 'warn') */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Posting client interface
 * Main API for library usage
 */
export interface PostingClient {
  /**
   * Publish a post to a social media platform
   * @param request - Post request with platform, content, and media
   * @param abortSignal - Optional signal to abort the operation
   * @returns Success response with post details or error response
   */
  post(request: PostRequestDto, abortSignal?: AbortSignal): Promise<PostResponseDto | ErrorResponseDto>;

  /**
   * Preview a post without actually publishing it
   * @param request - Post request to preview
   * @returns Preview response with validation results or error response
   */
  preview(request: PostRequestDto): Promise<PreviewResponseDto | PreviewErrorResponseDto>;

  /**
   * Cleanup resources and shutdown gracefully
   */
  destroy(): Promise<void>;
}

/**
 * Library-specific AppConfigService implementation
 * Uses in-memory configuration instead of NestJS ConfigService
 */
class LibraryAppConfigService {
  private readonly configData: {
    requestTimeoutSecs: number;
    retryAttempts: number;
    retryDelayMs: number;
    idempotencyTtlMinutes: number;
    accounts: Record<string, AccountConfig>;
  };

  constructor(libraryConfig: LibraryConfig) {
    this.configData = {
      requestTimeoutSecs: libraryConfig.requestTimeoutSecs ?? 60,
      retryAttempts: libraryConfig.retryAttempts ?? 3,
      retryDelayMs: libraryConfig.retryDelayMs ?? 1000,
      idempotencyTtlMinutes: libraryConfig.idempotencyTtlMinutes ?? 10,
      accounts: libraryConfig.accounts,
    };
  }

  get<T = any>(path: string): T | undefined {
    const keys = path.split('.');
    let value: any = this.configData;

    for (const key of keys) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[key];
    }

    return value as T;
  }

  getAccount(accountName: string): AccountConfig {
    const account = this.configData.accounts?.[accountName];
    if (!account) {
      throw new Error(`Account "${accountName}" not found in configuration`);
    }
    return account;
  }

  getAllAccounts(): Record<string, AccountConfig> {
    return this.configData.accounts || {};
  }

  get requestTimeoutSecs(): number {
    return this.configData.requestTimeoutSecs;
  }

  get retryAttempts(): number {
    return this.configData.retryAttempts;
  }

  get retryDelayMs(): number {
    return this.configData.retryDelayMs;
  }

  get idempotencyTtlMinutes(): number {
    return this.configData.idempotencyTtlMinutes;
  }
}

/**
 * Simple logger implementation for library mode
 * Compatible with nestjs-pino Logger interface
 */
class LibraryLogger {
  private readonly logLevel: string;

  constructor(logLevel: string = 'warn') {
    this.logLevel = logLevel;
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevel = levels.indexOf(this.logLevel);
    const targetLevel = levels.indexOf(level);
    return targetLevel >= currentLevel;
  }

  debug(message: any, context?: string): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG]${context ? ` [${context}]` : ''}`, message);
    }
  }

  log(message: any, context?: string): void {
    if (this.shouldLog('info')) {
      console.log(`[INFO]${context ? ` [${context}]` : ''}`, message);
    }
  }

  warn(message: any, context?: string): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN]${context ? ` [${context}]` : ''}`, message);
    }
  }

  error(message: any, trace?: string, context?: string): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR]${context ? ` [${context}]` : ''}`, message);
      if (trace) {
        console.error(trace);
      }
    }
  }
}

/**
 * Create a posting client for library usage
 * Initializes all necessary services without NestJS HTTP server
 * @param config - Library configuration
 * @returns PostingClient instance ready to use
 */
export function createPostingClient(config: LibraryConfig): PostingClient {
  // Validate configuration
  if (!config.accounts || Object.keys(config.accounts).length === 0) {
    throw new Error('At least one account must be configured');
  }

  // Set log level
  const logLevel = config.logLevel ?? 'warn';

  // Create logger
  const logger = new LibraryLogger(logLevel) as any;

  // Create app config service
  const appConfigService = new LibraryAppConfigService(config) as any;

  // Create platform registry and auth validator registry (no constructor args)
  const platformRegistry = new PlatformRegistry();
  const authValidatorRegistry = new AuthValidatorRegistry();

  // Create shutdown service
  const shutdownService = new ShutdownService(logger);

  // Create in-memory cache manager for idempotency
  const cacheManager = {
    async get<T>(key: string): Promise<T | undefined> {
      return undefined; // Fallback to in-memory implementation in IdempotencyService
    },
    async set(key: string, value: any, ttl?: number): Promise<void> {
      // No-op - IdempotencyService uses in-memory storage
    },
    async del(key: string): Promise<void> {
      // No-op
    },
    async reset(): Promise<void> {
      // No-op
    },
  };

  // Create idempotency service with mock cache manager
  const idempotencyService = new (IdempotencyService as any)(cacheManager, appConfigService);

  // Create main services
  const postService = new PostService(
    appConfigService,
    platformRegistry,
    authValidatorRegistry,
    idempotencyService,
    shutdownService,
  );

  const previewService = new PreviewService(
    appConfigService,
    platformRegistry,
    authValidatorRegistry,
  );

  // Return client interface
  return {
    async post(request: PostRequestDto, abortSignal?: AbortSignal): Promise<PostResponseDto | ErrorResponseDto> {
      return postService.publish(request, abortSignal);
    },

    async preview(request: PostRequestDto): Promise<PreviewResponseDto | PreviewErrorResponseDto> {
      return previewService.preview(request);
    },

    async destroy(): Promise<void> {
      // ShutdownService doesn't have a shutdown method, trigger lifecycle event manually
      await shutdownService.onApplicationShutdown('manual');
      shutdownService.onModuleDestroy();
    },
  };
}
