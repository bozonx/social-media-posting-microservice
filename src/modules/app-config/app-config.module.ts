import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './app-config.service.js';
import { NestConfigService } from './nest-config.service.js';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: AppConfigService,
      useClass: NestConfigService,
    },
  ],
  exports: [AppConfigService],
})
export class AppConfigModule {}
