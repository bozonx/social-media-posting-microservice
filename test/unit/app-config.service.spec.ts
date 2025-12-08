import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from '@/modules/app-config/app-config.service.js';
import { YAML_CONFIG_NAMESPACE } from '@config/yaml.config.js';

describe('AppConfigService', () => {
  let service: AppConfigService;
  let configService: ConfigService;

  const mockConfig = {
    requestTimeoutSecs: 60,
    retryAttempts: 3,
    retryDelayMs: 1000,
    idempotencyTtlMinutes: 10,


    accounts: {
      'test-account': {
        platform: 'telegram',

        auth: {
          apiKey: 'test-token',
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
      const platform = service.get('accounts.test-account.platform');
      expect(platform).toBe('telegram');
    });

    it('should return undefined for non-existent path', () => {
      const value = service.get('non.existent.path');
      expect(value).toBeUndefined();
    });

    it('should handle deeply nested paths', () => {
      const apiKey = service.get('accounts.test-account.auth.apiKey');
      expect(apiKey).toBe('test-token');
    });
  });

  describe('getAccount', () => {
    it('should return enabled account config', () => {
      const account = service.getAccount('test-account');
      expect(account).toEqual({
        platform: 'telegram',
        auth: {
          apiKey: 'test-token',
          chatId: 'test-chat-id',
        },
      });
    });

    it('should throw error for non-existent account', () => {
      expect(() => service.getAccount('non-existent')).toThrow(
        'Account "non-existent" not found in configuration',
      );
    });
  });

  describe('getAllAccounts', () => {
    it('should return all channels', () => {
      const channels = service.getAllAccounts();
      expect(channels).toHaveProperty('test-account');
    });
  });

  describe('getters', () => {
    it('should return correct values via getters', () => {
      expect(service.retryAttempts).toBe(3);
      expect(service.retryDelayMs).toBe(1000);
      expect(service.requestTimeoutSecs).toBe(60);
      expect(service.idempotencyTtlMinutes).toBe(10);
    });
  });


});
