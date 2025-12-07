import { Module, OnModuleInit } from '@nestjs/common';
import { TelegramPlatform } from './telegram/telegram.platform.js';

import { MediaModule } from '../media/media.module.js';
import { TelegramTypeDetector } from './telegram/telegram-type-detector.service.js';
import { TelegramAuthValidator } from './telegram/telegram-auth.validator.js';
import { PlatformRegistry } from './base/platform-registry.service.js';
import { AuthValidatorRegistry } from './base/auth-validator-registry.service.js';

@Module({
  imports: [MediaModule],
  providers: [
    PlatformRegistry,
    AuthValidatorRegistry,
    TelegramPlatform,
    TelegramTypeDetector,
    TelegramAuthValidator,
  ],
  exports: [
    PlatformRegistry,
    AuthValidatorRegistry,
    TelegramPlatform,
    TelegramTypeDetector,
    MediaModule,
  ],
})
export class PlatformsModule implements OnModuleInit {
  constructor(
    private readonly platformRegistry: PlatformRegistry,
    private readonly authValidatorRegistry: AuthValidatorRegistry,
    private readonly telegramPlatform: TelegramPlatform,
    private readonly telegramAuthValidator: TelegramAuthValidator,
  ) {}

  onModuleInit(): void {
    // Register platforms
    this.platformRegistry.register(this.telegramPlatform);

    // Register auth validators
    this.authValidatorRegistry.register(this.telegramAuthValidator);
  }
}
