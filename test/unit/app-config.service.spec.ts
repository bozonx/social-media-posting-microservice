import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

jest.mock('fs');
jest.mock('js-yaml');

describe('AppConfigService', () => {
  let service: AppConfigService;
  let configService: ConfigService;

  const mockConfig = {
    common: {
      retryAttempts: 3,
      retryDelayMs: 1000,
    },
    conversion: {
      preserveLinks: true,
      stripHtml: false,
    },
    channels: {
      'test-channel': {
        provider: 'telegram',
        enabled: true,
        auth: {
          botToken: 'test-token',
          chatId: 'test-chat-id',
        },
      },
      'disabled-channel': {
        provider: 'telegram',
        enabled: false,
        auth: {
          botToken: 'test-token',
          chatId: 'test-chat-id',
        },
      },
      'env-channel': {
        provider: 'telegram',
        enabled: true,
        auth: {
          botToken: '${BOT_TOKEN}',
          chatId: '${CHAT_ID}',
        },
      },
    },
  };

  beforeEach(async () => {
    // Мокируем переменные окружения
    process.env.BOT_TOKEN = 'token-from-env';
    process.env.CHAT_ID = 'chat-from-env';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppConfigService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('./config.yaml'),
          },
        },
      ],
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
    configService = module.get<ConfigService>(ConfigService);

    // Мокируем чтение файла
    (fs.readFileSync as jest.Mock).mockReturnValue('yaml content');
    (yaml.load as jest.Mock).mockReturnValue(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.BOT_TOKEN;
    delete process.env.CHAT_ID;
  });

  describe('onModuleInit', () => {
    it('should load config from default path', () => {
      service.onModuleInit();

      expect(configService.get).toHaveBeenCalledWith('CONFIG_PATH');
      expect(fs.readFileSync).toHaveBeenCalledWith('./config.yaml', 'utf8');
      expect(yaml.load).toHaveBeenCalledWith('yaml content');
    });

    it('should load config from custom path', () => {
      (configService.get as jest.Mock).mockReturnValue('/custom/path/config.yaml');

      service.onModuleInit();

      expect(fs.readFileSync).toHaveBeenCalledWith('/custom/path/config.yaml', 'utf8');
    });

    it('should throw error on invalid config file', () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => service.onModuleInit()).toThrow('Failed to load config');
    });

    it('should substitute environment variables', () => {
      service.onModuleInit();

      const channel = service.getChannel('env-channel');
      expect(channel.auth.botToken).toBe('token-from-env');
      expect(channel.auth.chatId).toBe('chat-from-env');
    });
  });

  describe('substituteEnvVariables', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should replace environment variables in strings', () => {
      process.env.TEST_VAR = 'test-value';
      const result = (service as any).substituteEnvVariables('prefix-${TEST_VAR}-suffix');
      expect(result).toBe('prefix-test-value-suffix');
      delete process.env.TEST_VAR;
    });

    it('should handle multiple variables in one string', () => {
      process.env.VAR1 = 'value1';
      process.env.VAR2 = 'value2';
      const result = (service as any).substituteEnvVariables('${VAR1}-${VAR2}');
      expect(result).toBe('value1-value2');
      delete process.env.VAR1;
      delete process.env.VAR2;
    });

    it('should throw error for undefined environment variables', () => {
      expect(() => {
        (service as any).substituteEnvVariables('${UNDEFINED_VAR}');
      }).toThrow('Environment variable UNDEFINED_VAR is not defined');
    });

    it('should process arrays', () => {
      process.env.TEST_VAR = 'test-value';
      const result = (service as any).substituteEnvVariables(['${TEST_VAR}', 'static']);
      expect(result).toEqual(['test-value', 'static']);
      delete process.env.TEST_VAR;
    });

    it('should process nested objects', () => {
      process.env.TEST_VAR = 'test-value';
      const input = {
        level1: {
          level2: '${TEST_VAR}',
        },
      };
      const result = (service as any).substituteEnvVariables(input);
      expect(result.level1.level2).toBe('test-value');
      delete process.env.TEST_VAR;
    });

    it('should return primitives as-is', () => {
      expect((service as any).substituteEnvVariables(123)).toBe(123);
      expect((service as any).substituteEnvVariables(true)).toBe(true);
      expect((service as any).substituteEnvVariables(null)).toBe(null);
    });
  });

  describe('get', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should get top-level config value', () => {
      const common = service.get('common');
      expect(common).toEqual(mockConfig.common);
    });

    it('should get nested config value', () => {
      const retryAttempts = service.get('common.retryAttempts');
      expect(retryAttempts).toBe(3);
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
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should return enabled channel config', () => {
      const channel = service.getChannel('test-channel');
      expect(channel).toEqual({
        provider: 'telegram',
        enabled: true,
        auth: {
          botToken: 'test-token',
          chatId: 'test-chat-id',
        },
      });
    });

    it('should throw error for non-existent channel', () => {
      expect(() => service.getChannel('non-existent')).toThrow('Channel "non-existent" not found');
    });

    it('should throw error for disabled channel', () => {
      expect(() => service.getChannel('disabled-channel')).toThrow(
        'Channel "disabled-channel" is disabled',
      );
    });

    it('should return channel with substituted env variables', () => {
      const channel = service.getChannel('env-channel');
      expect(channel.auth.botToken).toBe('token-from-env');
      expect(channel.auth.chatId).toBe('chat-from-env');
    });
  });

  describe('getAllChannels', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should return all channels', () => {
      const channels = service.getAllChannels();
      expect(channels).toHaveProperty('test-channel');
      expect(channels).toHaveProperty('disabled-channel');
      expect(channels).toHaveProperty('env-channel');
    });

    it('should return empty object if no channels defined', () => {
      (yaml.load as jest.Mock).mockReturnValue({ common: {}, conversion: {} });
      service.onModuleInit();

      const channels = service.getAllChannels();
      expect(channels).toEqual({});
    });
  });

  describe('getCommonConfig', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should return common config', () => {
      const common = service.getCommonConfig();
      expect(common).toEqual({
        retryAttempts: 3,
        retryDelayMs: 1000,
      });
    });
  });

  describe('getConversionConfig', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should return conversion config', () => {
      const conversion = service.getConversionConfig();
      expect(conversion).toEqual({
        preserveLinks: true,
        stripHtml: false,
      });
    });
  });
});
