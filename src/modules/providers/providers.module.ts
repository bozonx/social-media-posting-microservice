import { Module, OnModuleInit } from '@nestjs/common';
import { TelegramProvider } from './telegram/telegram.provider.js';
import { ConverterModule } from '../converter/converter.module.js';
import { MediaModule } from '../media/media.module.js';
import { TelegramTypeDetector } from './telegram/telegram-type-detector.service.js';
import { TelegramBotCache } from './telegram/telegram-bot-cache.service.js';
import { TelegramAuthValidator } from './telegram/telegram-auth.validator.js';
import { ProviderRegistry } from './base/provider-registry.service.js';
import { AuthValidatorRegistry } from './base/auth-validator-registry.service.js';

@Module({
  imports: [ConverterModule, MediaModule],
  providers: [
    ProviderRegistry,
    AuthValidatorRegistry,
    TelegramProvider,
    TelegramTypeDetector,
    TelegramBotCache,
    TelegramAuthValidator,
  ],
  exports: [
    ProviderRegistry,
    AuthValidatorRegistry,
    TelegramProvider,
    TelegramTypeDetector,
    TelegramBotCache,
    ConverterModule,
    MediaModule,
  ],
})
export class ProvidersModule implements OnModuleInit {
  constructor(
    private readonly providerRegistry: ProviderRegistry,
    private readonly authValidatorRegistry: AuthValidatorRegistry,
    private readonly telegramProvider: TelegramProvider,
    private readonly telegramAuthValidator: TelegramAuthValidator,
  ) {}

  onModuleInit(): void {
    // Register providers
    this.providerRegistry.register(this.telegramProvider);

    // Register auth validators
    this.authValidatorRegistry.register(this.telegramAuthValidator);
  }
}
