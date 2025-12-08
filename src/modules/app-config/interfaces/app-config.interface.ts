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
  /** Absolute maximum body length limit (characters) */
  maxBodyLimit: number;

  /** Named account configurations */
  accounts: Record<string, AccountConfig>;
}

/**
 * Account configuration
 * Represents a named account with platform and authentication details
 */
export interface AccountConfig {
  /** Platform name (e.g., 'telegram') */
  platform: string;

  /** Authentication credentials */
  auth: Record<string, string>;

  /** Platform-specific channel/chat identifier (e.g., Telegram channel username or chat ID) */
  channelId?: string | number;
  /** Maximum body length for this account (characters) */
  maxBody?: number;

  /** Additional provider-specific settings */
  [key: string]: any;
}
