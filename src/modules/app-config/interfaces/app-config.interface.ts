export interface AppConfig {
  common: {
    connectionTimeoutSecs: number;
    requestTimeoutSecs: number;
    convertBody: boolean;
    retryAttempts: number;
    retryDelayMs: number;
    idempotencyTtlMinutes: number;
  };
  conversion: {
    preserveLinks: boolean;
    stripHtml: boolean;
  };
  providers: Record<string, ProviderDefaultConfig>;
  channels: Record<string, ChannelConfig>;
}

export interface ProviderDefaultConfig {
  sdkVersion: string;
  maxRetries: number;
}

export interface ChannelConfig {
  provider: string;
  enabled: boolean;
  auth: Record<string, string>;
  [key: string]: any;
}
