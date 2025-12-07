import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from '@/modules/app-config/app-config.service.js';
import { YAML_CONFIG_NAMESPACE } from '@config/yaml.config.js';

describe('AppConfigService', () => {
  let service: AppConfigService;
  let configService: ConfigService;

  const mockConfig = {
    providerTimeoutSecs: 45,
    incomingRequestTimeoutSecs: 60,
    convertBodyDefault: true,
    retryAttempts: 3,
    retryDelayMs: 1000,
    idempotencyTtlMinutes: 10,
    conversion: {
      preserveLinks: true,
      stripHtml: false,
    },
    providers: {
      telegram: {
        sdkVersion: 'latest',
        maxRetries: 3,
      },
    },
    channels: {
      'test-channel': {
        provider: 'telegram',

        auth: {
          botToken: 'test-token',
          chatId: 'test-chat-id',
        },
      },

    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppConfigService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === YAML_CONFIG_NAMESPACE) {
                return mockConfig;
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw if YAML config section is not loaded', () => {
    const failingConfigService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    expect(() => new AppConfigService(failingConfigService)).toThrow(
      `Configuration section "${YAML_CONFIG_NAMESPACE}" is not loaded`,
    );
  });

  describe('get', () => {
    it('should get top-level config value', () => {
      const attempts = service.get('retryAttempts');
      expect(attempts).toBe(3);
    });

    it('should get nested config value', () => {
      const stripHtml = service.get('conversion.stripHtml');
      expect(stripHtml).toBe(false);
    });

    it('should return undefined for non-existent path', () => {
      const value = service.get('non.existent.path');
      expect(value).toBeUndefined();
    });

    it('should handle deeply nested paths', () => {
      const botToken = service.get('channels.test-channel.auth.botToken');
      expect(botToken).toBe('test-token');
    });
  });

  describe('getChannel', () => {
    it('should return enabled channel config', () => {
      const channel = service.getChannel('test-channel');
      expect(channel).toEqual({
        provider: 'telegram',
        auth: {
          botToken: 'test-token',
          chatId: 'test-chat-id',
        },
      });
    });

    it('should throw error for non-existent channel', () => {
      expect(() => service.getChannel('non-existent')).toThrow(
        'Channel "non-existent" not found in config',
      );
    });


  });

  describe('getAllChannels', () => {
    it('should return all channels', () => {
      const channels = service.getAllChannels();
      expect(channels).toHaveProperty('test-channel');
    });
  });

  describe('getters', () => {
    it('should return correct values via getters', () => {
      expect(service.retryAttempts).toBe(3);
      expect(service.retryDelayMs).toBe(1000);
      expect(service.incomingRequestTimeoutSecs).toBe(60);
      expect(service.providerTimeoutSecs).toBe(45);
      expect(service.convertBodyDefault).toBe(true);
      expect(service.idempotencyTtlMinutes).toBe(10);
    });
  });

  describe('getConversionConfig', () => {
    it('should return conversion config', () => {
      const conversion = service.getConversionConfig();
      expect(conversion).toEqual({
        preserveLinks: true,
        stripHtml: false,
      });
    });
  });
});
