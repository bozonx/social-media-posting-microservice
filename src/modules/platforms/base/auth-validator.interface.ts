/**
 * Interface for provider-specific auth validation
 * Each provider implements its own validation logic
 */
export interface IAuthValidator {
  /**
   * Provider name this validator is for
   */
  readonly providerName: string;

  /**
   * Validate auth object for the provider
   * @param auth - Auth object to validate
   * @returns Array of error messages (empty if valid)
   */
  validate(auth: Record<string, any>): string[];
}
