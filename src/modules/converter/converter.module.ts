import { Module } from '@nestjs/common';
import { ConverterService } from './converter.service.js';
import { AppConfigModule } from '../app-config/app-config.module.js';

@Module({
  imports: [AppConfigModule],
  providers: [ConverterService],
  exports: [ConverterService],
})
export class ConverterModule {}
