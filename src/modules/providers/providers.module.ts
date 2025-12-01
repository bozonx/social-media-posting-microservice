import { Module } from '@nestjs/common';
import { TelegramProvider } from './telegram/telegram.provider';
import { ConverterModule } from '../converter/converter.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [ConverterModule, MediaModule],
  providers: [TelegramProvider],
  exports: [TelegramProvider],
})
export class ProvidersModule {}
