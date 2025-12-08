import 'reflect-metadata';
import { validateYamlConfig, YamlConfigDto } from '../../src/config/yaml-config.dto.js';

describe('YamlConfigDto', () => {
  describe('validateYamlConfig', () => {
    it('should validate a correct configuration', () => {
      const config = {
        requestTimeoutSecs: 60,
        retryAttempts: 3,
        retryDelayMs: 1000,
        idempotencyTtlMinutes: 10,
        maxBodyLimit: 500000,

        accounts: {
          test_channel: {
            platform: 'telegram',
            auth: {
              apiKey: 'test_token',
              chatId: '@test',
            },
          },
        },
      };

      const result = validateYamlConfig(config);
      expect(result).toBeInstanceOf(YamlConfigDto);
      expect(result.requestTimeoutSecs).toBe(60);
      expect(result.retryAttempts).toBe(3);
    });

    it('should reject requestTimeoutSecs below minimum', () => {
      const config = {
        requestTimeoutSecs: 0,
        retryAttempts: 3,
        retryDelayMs: 1000,
        idempotencyTtlMinutes: 10,
        maxBodyLimit: 500000,
        platforms: {},
        accounts: {},
      };

      expect(() => validateYamlConfig(config)).toThrow(/requestTimeoutSecs/);
    });

    it('should reject requestTimeoutSecs above maximum', () => {
      const config = {
        requestTimeoutSecs: 301,
        retryAttempts: 3,
        retryDelayMs: 1000,
        idempotencyTtlMinutes: 10,
        maxBodyLimit: 500000,

        accounts: {},
      };

      expect(() => validateYamlConfig(config)).toThrow(/requestTimeoutSecs/);
    });

    it('should reject retryAttempts below minimum', () => {
      const config = {
        requestTimeoutSecs: 60,
        retryAttempts: -1,
        retryDelayMs: 1000,
        idempotencyTtlMinutes: 10,
        maxBodyLimit: 500000,

        accounts: {},
      };

      expect(() => validateYamlConfig(config)).toThrow(/retryAttempts/);
    });

    it('should reject retryAttempts above maximum', () => {
      const config = {
        requestTimeoutSecs: 60,
        retryAttempts: 11,
        retryDelayMs: 1000,
        idempotencyTtlMinutes: 10,
        maxBodyLimit: 500000,

        accounts: {},
      };

      expect(() => validateYamlConfig(config)).toThrow(/retryAttempts/);
    });

    it('should reject retryDelayMs below minimum', () => {
      const config = {
        requestTimeoutSecs: 60,
        retryAttempts: 3,
        retryDelayMs: -1,
        idempotencyTtlMinutes: 10,
        maxBodyLimit: 500000,

        accounts: {},
      };

      expect(() => validateYamlConfig(config)).toThrow(/retryDelayMs/);
    });

    it('should reject retryDelayMs above maximum', () => {
      const config = {
        requestTimeoutSecs: 60,
        retryAttempts: 3,
        retryDelayMs: 60001,
        idempotencyTtlMinutes: 10,
        maxBodyLimit: 500000,

        accounts: {},
      };

      expect(() => validateYamlConfig(config)).toThrow(/retryDelayMs/);
    });

    it('should reject idempotencyTtlMinutes below minimum', () => {
      const config = {
        requestTimeoutSecs: 60,
        retryAttempts: 3,
        retryDelayMs: 1000,
        idempotencyTtlMinutes: 0,
        maxBodyLimit: 500000,

        accounts: {},
      };

      expect(() => validateYamlConfig(config)).toThrow(/idempotencyTtlMinutes/);
    });

    it('should reject idempotencyTtlMinutes above maximum', () => {
      const config = {
        requestTimeoutSecs: 60,
        retryAttempts: 3,
        retryDelayMs: 1000,
        idempotencyTtlMinutes: 1441,
        maxBodyLimit: 500000,

        accounts: {},
      };

      expect(() => validateYamlConfig(config)).toThrow(/idempotencyTtlMinutes/);
    });

    it('should reject missing required fields', () => {
      const config = {
        requestTimeoutSecs: 60,
        // Missing other required fields
      };

      expect(() => validateYamlConfig(config)).toThrow(/validation error/);
    });

    it('should accept edge case values', () => {
      const config = {
        requestTimeoutSecs: 1, // Min
        retryAttempts: 0, // Min
        retryDelayMs: 0, // Min
        idempotencyTtlMinutes: 1, // Min
        maxBodyLimit: 1, // Min

        accounts: {},
      };

      const result = validateYamlConfig(config);
      expect(result.requestTimeoutSecs).toBe(1);
      expect(result.retryAttempts).toBe(0);
    });

    it('should accept maximum edge case values', () => {
      const config = {
        requestTimeoutSecs: 300, // Max
        retryAttempts: 10, // Max
        retryDelayMs: 60000, // Max
        idempotencyTtlMinutes: 1440, // Max
        maxBodyLimit: 500000, // Max

        accounts: {},
      };

      const result = validateYamlConfig(config);
      expect(result.requestTimeoutSecs).toBe(300);
      expect(result.retryAttempts).toBe(10);
    });

    it('should reject channel without platform field', () => {
      const config = {
        requestTimeoutSecs: 60,
        retryAttempts: 3,
        retryDelayMs: 1000,
        idempotencyTtlMinutes: 10,
        maxBodyLimit: 500000,
        accounts: {
          broken_channel: {
            // Missing platform
            auth: {
              apiKey: 'test',
            },
          },
        },
      };

      expect(() => validateYamlConfig(config)).toThrow(
        /YAML config validation error: .*broken_channel/i,
      );
    });

    it('should reject channel with non-string platform', () => {
      const config = {
        requestTimeoutSecs: 60,
        retryAttempts: 3,
        retryDelayMs: 1000,
        idempotencyTtlMinutes: 10,
        maxBodyLimit: 500000,
        accounts: {
          broken_channel: {
            platform: 123,
            auth: {
              apiKey: 'test',
            },
          },
        },
      };

      expect(() => validateYamlConfig(config)).toThrow(
        /YAML config validation error: .*broken_channel/i,
      );
    });

    it('should validate account with maxBody', () => {
      const config = {
        requestTimeoutSecs: 60,
        retryAttempts: 3,
        retryDelayMs: 1000,
        idempotencyTtlMinutes: 10,
        maxBodyLimit: 500000,
        accounts: {
          test_channel: {
            platform: 'telegram',
            auth: { apiKey: 'test' },
            maxBody: 100000,
          },
        },
      };

      const result = validateYamlConfig(config);
      expect(result.accounts.test_channel.maxBody).toBe(100000);
    });

    it('should reject account with maxBody below minimum', () => {
      const config = {
        requestTimeoutSecs: 60,
        retryAttempts: 3,
        retryDelayMs: 1000,
        idempotencyTtlMinutes: 10,
        maxBodyLimit: 500000,
        accounts: {
          test_channel: {
            platform: 'telegram',
            auth: { apiKey: 'test' },
            maxBody: 0,
          },
        },
      };

      expect(() => validateYamlConfig(config)).toThrow(/test_channel/);
    });

    it('should reject account with maxBody above maximum', () => {
      const config = {
        requestTimeoutSecs: 60,
        retryAttempts: 3,
        retryDelayMs: 1000,
        idempotencyTtlMinutes: 10,
        maxBodyLimit: 500000,
        accounts: {
          test_channel: {
            platform: 'telegram',
            auth: { apiKey: 'test' },
            maxBody: 500001,
          },
        },
      };

      expect(() => validateYamlConfig(config)).toThrow(/test_channel/);
    });
  });
});
