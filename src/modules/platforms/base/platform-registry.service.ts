import { Injectable, BadRequestException } from '@nestjs/common';
import { IPlatform } from './platform.interface.js';

/**
 * Registry for managing platform instances
 * Simplifies adding new platforms and eliminates switch-case duplication
 */
@Injectable()
export class PlatformRegistry {
  private readonly platforms = new Map<string, IPlatform>();

  /**
   * Register a platform instance
   * @param platform - Platform instance to register
   */
  register(platform: IPlatform): void {
    this.platforms.set(platform.name.toLowerCase(), platform);
  }

  /**
   * Get platform by name
   * @param platformName - Platform name (e.g., 'telegram')
   * @returns Platform instance
   * @throws BadRequestException if platform is not found
   */
  get(platformName: string): IPlatform {
    const platform = this.platforms.get(platformName.toLowerCase());
    if (!platform) {
      throw new BadRequestException(`Platform "${platformName}" is not supported`);
    }
    return platform;
  }

  /**
   * Check if platform exists
   * @param platformName - Platform name
   * @returns True if platform is registered
   */
  has(platformName: string): boolean {
    return this.platforms.has(platformName.toLowerCase());
  }

  /**
   * Get all registered platform names
   * @returns Array of platform names
   */
  getRegisteredPlatforms(): string[] {
    return Array.from(this.platforms.keys());
  }
}
