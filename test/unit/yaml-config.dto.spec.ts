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
        maxBodyDefault: 500000,

        channels: {
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
        maxBodyDefault: 500000,
        platforms: {},
        channels: {},
      };

      expect(() => validateYamlConfig(config)).toThrow(/requestTimeoutSecs/);
    });

    it('should reject requestTimeoutSecs above maximum', () => {
      const config = {
        requestTimeoutSecs: 301,
        retryAttempts: 3,
        retryDelayMs: 1000,
        idempotencyTtlMinutes: 10,
        maxBodyDefault: 500000,

        channels: {},
      };

      expect(() => validateYamlConfig(config)).toThrow(/requestTimeoutSecs/);
    });

    it('should reject retryAttempts below minimum', () => {
      const config = {
        requestTimeoutSecs: 60,
        retryAttempts: -1,
        retryDelayMs: 1000,
        idempotencyTtlMinutes: 10,
        maxBodyDefault: 500000,

        channels: {},
      };

      expect(() => validateYamlConfig(config)).toThrow(/retryAttempts/);
    });

    it('should reject retryAttempts above maximum', () => {
      const config = {
        requestTimeoutSecs: 60,
        retryAttempts: 11,
        retryDelayMs: 1000,
        idempotencyTtlMinutes: 10,
        maxBodyDefault: 500000,

        channels: {},
      };

      expect(() => validateYamlConfig(config)).toThrow(/retryAttempts/);
    });

    it('should reject retryDelayMs below minimum', () => {
      const config = {
        requestTimeoutSecs: 60,
        retryAttempts: 3,
        retryDelayMs: -1,
        idempotencyTtlMinutes: 10,
        maxBodyDefault: 500000,

        channels: {},
      };

      expect(() => validateYamlConfig(config)).toThrow(/retryDelayMs/);
    });

    it('should reject retryDelayMs above maximum', () => {
      const config = {
        requestTimeoutSecs: 60,
        retryAttempts: 3,
        retryDelayMs: 60001,
        idempotencyTtlMinutes: 10,
        maxBodyDefault: 500000,

        channels: {},
      };

      expect(() => validateYamlConfig(config)).toThrow(/retryDelayMs/);
    });

    it('should reject idempotencyTtlMinutes below minimum', () => {
      const config = {
        requestTimeoutSecs: 60,
        retryAttempts: 3,
        retryDelayMs: 1000,
        idempotencyTtlMinutes: 0,
        maxBodyDefault: 500000,

        channels: {},
      };

      expect(() => validateYamlConfig(config)).toThrow(/idempotencyTtlMinutes/);
    });

    it('should reject idempotencyTtlMinutes above maximum', () => {
      const config = {
        requestTimeoutSecs: 60,
        retryAttempts: 3,
        retryDelayMs: 1000,
        idempotencyTtlMinutes: 1441,
        maxBodyDefault: 500000,

        channels: {},
      };

      expect(() => validateYamlConfig(config)).toThrow(/idempotencyTtlMinutes/);
    });

    it('should reject maxBodyDefault below minimum', () => {
      const config = {
        requestTimeoutSecs: 60,
        retryAttempts: 3,
        retryDelayMs: 1000,
        idempotencyTtlMinutes: 10,
        maxBodyDefault: 0,

        channels: {},
      };

      expect(() => validateYamlConfig(config)).toThrow(/maxBodyDefault/);
    });

    it('should reject maxBodyDefault above maximum', () => {
      const config = {
        requestTimeoutSecs: 60,
        retryAttempts: 3,
        retryDelayMs: 1000,
        idempotencyTtlMinutes: 10,
        maxBodyDefault: 500001,

        channels: {},
      };

      expect(() => validateYamlConfig(config)).toThrow(/maxBodyDefault/);
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
        maxBodyDefault: 1, // Min

        channels: {},
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
        maxBodyDefault: 500000, // Max

        channels: {},
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
        maxBodyDefault: 500000,
        channels: {
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
        maxBodyDefault: 500000,
        channels: {
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
  });
});
