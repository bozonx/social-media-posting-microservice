import { Injectable, BadRequestException } from '@nestjs/common';
import { IProvider } from './provider.interface.js';

/**
 * Registry for managing provider instances
 * Simplifies adding new providers and eliminates switch-case duplication
 */
@Injectable()
export class ProviderRegistry {
  private readonly providers = new Map<string, IProvider>();

  /**
   * Register a provider instance
   * @param provider - Provider instance to register
   */
  register(provider: IProvider): void {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  /**
   * Get provider by platform name
   * @param platform - Platform name (e.g., 'telegram')
   * @returns Provider instance
   * @throws BadRequestException if provider is not found
   */
  get(platform: string): IProvider {
    const provider = this.providers.get(platform.toLowerCase());
    if (!provider) {
      throw new BadRequestException(`Provider "${platform}" is not supported`);
    }
    return provider;
  }

  /**
   * Check if provider exists
   * @param platform - Platform name
   * @returns True if provider is registered
   */
  has(platform: string): boolean {
    return this.providers.has(platform.toLowerCase());
  }

  /**
   * Get all registered provider names
   * @returns Array of provider names
   */
  getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
