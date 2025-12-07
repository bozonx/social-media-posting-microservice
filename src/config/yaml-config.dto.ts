import { IsInt, IsString, IsObject, IsOptional, Min, Max, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Channel configuration validation class
 * Validates the structure and values of channel configurations
 */
class ChannelConfigValidationDto {
  /**
   * Platform name
   * Must be a non-empty string
   */
  @IsString()
  platform!: string;

  /**
   * Authentication configuration
   * Optional, must be an object if present
   */
  @IsOptional()
  @IsObject()
  auth?: Record<string, any>;
}

/**
 * YAML configuration validation class
 * Validates the structure and values from config.yaml
 */
export class YamlConfigDto {
  /**
   * Request timeout in seconds
   * Must be between 1 and 300 (5 minutes)
   */
  @IsInt()
  @Min(1)
  @Max(300)
  requestTimeoutSecs!: number;

  /**
   * Number of retry attempts on error
   * Must be between 0 and 10
   */
  @IsInt()
  @Min(0)
  @Max(10)
  retryAttempts!: number;

  /**
   * Delay between retry attempts in milliseconds
   * Must be between 0 and 60000 (1 minute)
   */
  @IsInt()
  @Min(0)
  @Max(60000)
  retryDelayMs!: number;

  /**
   * Time-to-live for idempotency records in cache (minutes)
   * Must be between 1 and 1440 (24 hours)
   */
  @IsInt()
  @Min(1)
  @Max(1440)
  idempotencyTtlMinutes!: number;

  /**
   * Default maximum body length in characters
   * Must be between 1 and 500000
   */
  @IsInt()
  @Min(1)
  @Max(500000)
  maxBodyDefault!: number;

  /**
   * Named channel configurations
   */
  @IsObject()
  channels!: Record<string, any>;
}

/**
 * Validates YAML configuration object
 * @param config - Raw configuration object from YAML file
 * @throws Error if validation fails
 * @returns Validated configuration object
 */
export function validateYamlConfig(config: any): YamlConfigDto {
  const dto = plainToClass(YamlConfigDto, config);

  const errors = validateSync(dto, {
    skipMissingProperties: false,
    whitelist: false, // Allow additional properties in channels
  });

  const errorMessages: string[] = [];

  if (errors.length > 0) {
    for (const err of errors) {
      const constraints = err.constraints ? Object.values(err.constraints).join(', ') : '';
      errorMessages.push(`${err.property}: ${constraints}`);
    }
  }

  const channelErrorMessages: string[] = [];

  if (dto.channels && typeof dto.channels === 'object') {
    for (const [channelName, channelConfig] of Object.entries(dto.channels)) {
      const channelDto = plainToClass(ChannelConfigValidationDto, channelConfig);
      const channelErrors = validateSync(channelDto, {
        skipMissingProperties: false,
        whitelist: false,
      });

      if (channelErrors.length > 0) {
        const constraints = channelErrors
          .map(err => {
            const msg = err.constraints ? Object.values(err.constraints).join(', ') : '';
            return `${err.property}: ${msg}`;
          })
          .join('; ');

        channelErrorMessages.push(`channel "${channelName}": ${constraints}`);
      }
    }
  }

  const allErrors = [...errorMessages, ...channelErrorMessages];

  if (allErrors.length > 0) {
    throw new Error(`YAML config validation error: ${allErrors.join('; ')}`);
  }

  return dto;
}
