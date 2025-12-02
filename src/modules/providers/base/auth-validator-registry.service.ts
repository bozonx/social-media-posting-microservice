import { Injectable, BadRequestException } from '@nestjs/common';
import { IAuthValidator } from './auth-validator.interface.js';

/**
 * Registry for provider-specific auth validators
 */
@Injectable()
export class AuthValidatorRegistry {
  private readonly validators = new Map<string, IAuthValidator>();

  /**
   * Register an auth validator
   * @param validator - Auth validator instance
   */
  register(validator: IAuthValidator): void {
    this.validators.set(validator.providerName.toLowerCase(), validator);
  }

  /**
   * Validate auth object for a specific provider
   * @param platform - Platform name
   * @param auth - Auth object to validate
   * @throws BadRequestException if validation fails
   */
  validate(platform: string, auth: Record<string, any>): void {
    const validator = this.validators.get(platform.toLowerCase());
    if (!validator) {
      // No validator registered - skip validation
      return;
    }

    const errors = validator.validate(auth);
    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }
  }

  /**
   * Check if validator exists for platform
   * @param platform - Platform name
   * @returns True if validator is registered
   */
  has(platform: string): boolean {
    return this.validators.has(platform.toLowerCase());
  }
}
