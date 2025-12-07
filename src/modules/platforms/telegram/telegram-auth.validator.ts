import { Injectable } from '@nestjs/common';
import { IAuthValidator } from '../base/auth-validator.interface.js';

/**
 * Telegram-specific auth validator
 * Validates botToken and chatId presence and format
 */
@Injectable()
export class TelegramAuthValidator implements IAuthValidator {
  readonly providerName = 'telegram';

  /**
   * Validate Telegram auth object
   * @param auth - Auth object with botToken and chatId
   * @returns Array of error messages (empty if valid)
   */
  validate(auth: Record<string, any>): string[] {
    const errors: string[] = [];

    if (!auth) {
      errors.push('Auth object is required for Telegram');
      return errors;
    }

    // Validate botToken
    if (!auth.botToken) {
      errors.push("Field 'botToken' is required for Telegram auth");
    } else if (typeof auth.botToken !== 'string') {
      errors.push("Field 'botToken' must be a string");
    } else if (!this.isValidBotToken(auth.botToken)) {
      errors.push("Field 'botToken' has invalid format (expected: 123456789:ABC-DEF...)");
    }

    // Validate chatId
    if (!auth.chatId) {
      errors.push("Field 'chatId' is required for Telegram auth");
    } else if (typeof auth.chatId !== 'string' && typeof auth.chatId !== 'number') {
      errors.push("Field 'chatId' must be a string or number");
    }

    return errors;
  }

  /**
   * Check if botToken has valid format
   * Telegram bot tokens have format: 123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
   */
  private isValidBotToken(token: string): boolean {
    // Basic format check: number:alphanumeric-string
    const tokenRegex = /^\d+:[A-Za-z0-9_-]+$/;
    return tokenRegex.test(token);
  }
}
