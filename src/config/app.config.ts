import { registerAs } from '@nestjs/config';
import { IsInt, IsString, IsIn, Min, Max, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Application configuration class
 * Validates environment variables and provides type-safe configuration
 */
export class AppConfig {
  /**
   * Port number for the HTTP server
   * Must be between 1 and 65535
   */
  @IsInt()
  @Min(1)
  @Max(65535)
  public port!: number;

  /**
   * Host address to bind the server to
   * Examples: 'localhost', '0.0.0.0', '127.0.0.1'
   */
  @IsString()
  public host!: string;

  /**
   * Base path for API endpoints
   * Will be combined with version to form the global prefix
   */
  @IsString()
  public apiBasePath!: string;

  /**
   * Node environment mode
   * Determines logging behavior and other environment-specific settings
   */
  @IsIn(['development', 'production', 'test'])
  public nodeEnv!: string;

  /**
   * Logging level for Pino logger
   * Controls the verbosity of application logs
   */
  @IsIn(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
  public logLevel!: string;
}

export default registerAs('app', (): AppConfig => {
  const config = plainToClass(AppConfig, {
    port: parseInt(process.env.LISTEN_PORT ?? '8080', 10),
    host: process.env.LISTEN_HOST ?? '0.0.0.0',
    apiBasePath: (process.env.API_BASE_PATH ?? 'api').replace(/^\/+|\/+$/g, ''),
    nodeEnv: process.env.NODE_ENV ?? 'production',
    logLevel: process.env.LOG_LEVEL ?? 'warn',
  });

  const errors = validateSync(config, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors.map(err => Object.values(err.constraints ?? {}).join(', '));
    throw new Error(`App config validation error: ${errorMessages.join('; ')}`);
  }

  return config;
});
