import { Module } from '@nestjs/common';
import { ConverterService } from './converter.service';
import { AppConfigModule } from '../app-config/app-config.module';

@Module({
  imports: [AppConfigModule],
  providers: [ConverterService],
  exports: [ConverterService],
})
export class ConverterModule {}
