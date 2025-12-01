import { Module } from '@nestjs/common';
import { TelegramProvider } from './telegram/telegram.provider';
import { ConverterModule } from '../converter/converter.module';
import { MediaModule } from '../media/media.module';
import { TelegramTypeDetector } from './telegram/telegram-type-detector.service';

@Module({
  imports: [ConverterModule, MediaModule],
  providers: [TelegramProvider, TelegramTypeDetector],
  exports: [TelegramProvider, TelegramTypeDetector, ConverterModule, MediaModule],
})
export class ProvidersModule {}
