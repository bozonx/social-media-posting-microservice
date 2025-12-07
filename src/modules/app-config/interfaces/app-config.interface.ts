/**
 * Application configuration structure from YAML file
 */
export interface AppConfig {
  /** Connection timeout with provider (seconds) */
  providerTimeoutSecs?: number;
  /** Request timeout (seconds) */
  incomingRequestTimeoutSecs: number;
  /** Automatic body conversion (default) */
  convertBodyDefault: boolean;
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
  /** Default provider configurations */
  providers: Record<string, ProviderDefaultConfig>;
  /** Named channel configurations */
  channels: Record<string, ChannelConfig>;
}

/**
 * Default configuration for a provider
 */
export interface ProviderDefaultConfig {
  sdkVersion: string;
  maxRetries: number;
}

/**
 * Channel configuration
 * Represents a named channel with provider and authentication details
 */
export interface ChannelConfig {
  /** Provider name (e.g., 'telegram') */
  provider: string;

  /** Authentication credentials */
  auth: Record<string, string>;
  /** Additional provider-specific settings */
  [key: string]: any;
}
