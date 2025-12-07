/**
 * Application configuration structure from YAML file
 */
export interface AppConfig {
  /** Request timeout (seconds) */
  requestTimeoutSecs: number;
  /** Automatic body conversion (default) */

  /** Number of retry attempts on error */
  retryAttempts: number;
  /** Delay between retry attempts (milliseconds) */
  retryDelayMs: number;
  /** Time-to-live for idempotency records in cache (minutes) */
  idempotencyTtlMinutes: number;
  /** Default maximum body length (characters) */
  maxBodyDefault: number;

  /** Named channel configurations */
  channels: Record<string, ChannelConfig>;
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
