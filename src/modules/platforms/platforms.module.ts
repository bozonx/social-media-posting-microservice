import { Module, OnModuleInit } from '@nestjs/common';
import { TelegramPlatform } from './telegram/telegram.platform.js';
import { ConverterModule } from '../converter/converter.module.js';
import { MediaModule } from '../media/media.module.js';
import { TelegramTypeDetector } from './telegram/telegram-type-detector.service.js';
import { TelegramBotCache } from './telegram/telegram-bot-cache.service.js';
import { TelegramAuthValidator } from './telegram/telegram-auth.validator.js';
import { PlatformRegistry } from './base/platform-registry.service.js';
import { AuthValidatorRegistry } from './base/auth-validator-registry.service.js';

@Module({
  imports: [ConverterModule, MediaModule],
  providers: [
    PlatformRegistry,
    AuthValidatorRegistry,
    TelegramPlatform,
    TelegramTypeDetector,
    TelegramBotCache,
    TelegramAuthValidator,
  ],
  exports: [
    PlatformRegistry,
    AuthValidatorRegistry,
    TelegramPlatform,
    TelegramTypeDetector,
    TelegramBotCache,
    ConverterModule,
    MediaModule,
  ],
})
export class PlatformsModule implements OnModuleInit {
  constructor(
    private readonly platformRegistry: PlatformRegistry,
    private readonly authValidatorRegistry: AuthValidatorRegistry,
    private readonly telegramPlatform: TelegramPlatform,
    private readonly telegramAuthValidator: TelegramAuthValidator,
  ) { }

  onModuleInit(): void {
    // Register platforms
    this.platformRegistry.register(this.telegramPlatform);

    // Register auth validators
    this.authValidatorRegistry.register(this.telegramAuthValidator);
  }
}
