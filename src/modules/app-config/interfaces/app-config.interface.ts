/**
 * Application configuration structure from YAML file
 */
export interface AppConfig {
  /** Common settings for all providers */
  common: {
    connectionTimeoutSecs: number;
    requestTimeoutSecs: number;
    convertBody: boolean;
    retryAttempts: number;
    retryDelayMs: number;
    idempotencyTtlMinutes: number;
  };
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
  /** Whether the channel is enabled */
  enabled: boolean;
  /** Authentication credentials */
  auth: Record<string, string>;
  /** Additional provider-specific settings */
  [key: string]: any;
}
