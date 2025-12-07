import {
    IsInt,
    IsString,
    IsObject,
    Min,
    Max,
    validateSync,
} from 'class-validator';
import { plainToClass } from 'class-transformer';

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

    if (errors.length > 0) {
        const errorMessages = errors.map(err => {
            const constraints = err.constraints ? Object.values(err.constraints).join(', ') : '';
            return `${err.property}: ${constraints}`;
        });
        throw new Error(`YAML config validation error: ${errorMessages.join('; ')}`);
    }

    return dto;
}
