import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { Bot } from 'grammy';

/**
 * Cache for Telegram Bot instances
 * Reuses bot instances by botToken to avoid creating new connections on each request
 */
@Injectable()
export class TelegramBotCache implements OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotCache.name);
  private readonly cache = new Map<string, Bot>();

  /**
   * Get or create a Bot instance for the given token
   * @param botToken - Telegram bot token
   * @returns Bot instance
   */
  getOrCreate(botToken: string): Bot {
    let bot = this.cache.get(botToken);
    if (!bot) {
      bot = new Bot(botToken);
      this.cache.set(botToken, bot);
      this.logger.debug(`Created new Bot instance for token: ${this.maskToken(botToken)}`);
    }
    return bot;
  }

  /**
   * Remove a Bot instance from cache
   * @param botToken - Telegram bot token
   */
  remove(botToken: string): void {
    this.cache.delete(botToken);
  }

  /**
   * Clear all cached Bot instances
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get number of cached instances
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    this.logger.log(`Clearing ${this.cache.size} cached Bot instances`);
    this.clear();
  }

  /**
   * Mask token for logging (show only first 8 chars)
   */
  private maskToken(token: string): string {
    if (token.length <= 8) {
      return '***';
    }
    return `${token.substring(0, 8)}...`;
  }
}
