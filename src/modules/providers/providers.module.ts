import { Module } from '@nestjs/common';
import { TelegramProvider } from './telegram/telegram.provider.js';
import { ConverterModule } from '../converter/converter.module.js';
import { MediaModule } from '../media/media.module.js';
import { TelegramTypeDetector } from './telegram/telegram-type-detector.service.js';

@Module({
  imports: [ConverterModule, MediaModule],
  providers: [TelegramProvider, TelegramTypeDetector],
  exports: [TelegramProvider, TelegramTypeDetector, ConverterModule, MediaModule],
})
export class ProvidersModule {}
