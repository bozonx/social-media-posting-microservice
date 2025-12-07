import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './modules/health/health.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import appConfig from './config/app.config.js';
import type { AppConfig } from './config/app.config.js';
import yamlConfig from './config/yaml.config.js';
import pkg from '../package.json' with { type: 'json' };
import { PostModule } from './modules/post/post.module.js';
import { AppConfigModule } from './modules/app-config/app-config.module.js';
import { PlatformsModule } from './modules/platforms/platforms.module.js';

import { MediaModule } from './modules/media/media.module.js';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, yamlConfig],
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      cache: true,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const appConfig = configService.get<AppConfig>('app')!;
        const isDev = appConfig.nodeEnv === 'development';

        return {
          pinoHttp: {
            level: appConfig.logLevel,
            timestamp: () => `,"@timestamp":"${new Date().toISOString()}"`,
            base: {
              service: (pkg as any).name ?? 'app',
              environment: appConfig.nodeEnv,
            },
            transport: isDev
              ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: false,
                  translateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss.l'Z'",
                  ignore: 'pid,hostname',
                  messageFormat: '[{context}] {msg}',
                },
              }
              : undefined,
            serializers: {
              req: req => ({
                id: req.id,
                method: req.method,
                url: req.url,
                path: req.url?.split('?')[0],
                remoteAddress: req.ip,
                remotePort: req.socket?.remotePort,
              }),
              res: res => ({
                statusCode: res.statusCode,
              }),
              err: err => ({
                type: err.type,
                message: err.message,
                stack: err.stack,
              }),
            },
            redact: {
              paths: ['req.headers.authorization', 'req.headers["x-api-key"]'],
              censor: '[REDACTED]',
            },
            customLogLevel: (req, res, err) => {
              if (res.statusCode >= 500 || err) {
                return 'error';
              }
              if (res.statusCode >= 400) {
                return 'warn';
              }
              if (res.statusCode >= 300) {
                return 'info';
              }
              return 'info';
            },
            autoLogging: {
              ignore: req => {
                if (appConfig.nodeEnv === 'production') {
                  return req.url?.includes('/health') || false;
                }
                return false;
              },
            },
          },
        };
      },
    }),
    HealthModule,
    AppConfigModule,
    PostModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule { }
