/**
 * Application configuration structure from YAML file
 */
export interface AppConfig {
  /** Connection timeout with platform (seconds) */
  platformTimeoutSecs?: number;
  /** Request timeout (seconds) */
  incomingRequestTimeoutSecs: number;
  /** Automatic body conversion (default) */

  /** Number of retry attempts on error */
  retryAttempts: number;
  /** Delay between retry attempts (milliseconds) */
  retryDelayMs: number;
  /** Time-to-live for idempotency records in cache (minutes) */
  idempotencyTtlMinutes: number;
  /** Content conversion settings */
  conversion: {
    preserveLinks: boolean;
    stripHtml: boolean;
  };
  /** Default platform configurations */
  platforms: Record<string, PlatformDefaultConfig>;
  /** Named channel configurations */
  channels: Record<string, ChannelConfig>;
}

/**
 * Default configuration for a platform
 */
export interface PlatformDefaultConfig {
  sdkVersion: string;
  maxRetries: number;
}

/**
 * Channel configuration
 * Represents a named channel with platform and authentication details
 */
export interface ChannelConfig {
  /** Platform name (e.g., 'telegram') */
  platform: string;

  /** Authentication credentials */
  auth: Record<string, string>;
  /** Additional provider-specific settings */
  [key: string]: any;
}
