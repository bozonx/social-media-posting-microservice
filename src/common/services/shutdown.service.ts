import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

/**
 * Service to manage graceful shutdown
 * Tracks in-flight requests and signals shutdown state to the application
 */
@Injectable()
export class ShutdownService implements OnApplicationShutdown {
  private readonly logger: Logger;
  private isShuttingDown = false;
  private inFlightRequests = 0;
  private shutdownResolve?: () => void;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Check if the application is shutting down
   */
  get shuttingDown(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Increment in-flight request counter
   */
  trackRequest(): void {
    this.inFlightRequests++;
  }

  /**
   * Decrement in-flight request counter and resolve shutdown if no requests remain
   */
  untrackRequest(): void {
    this.inFlightRequests--;
    if (this.isShuttingDown && this.inFlightRequests <= 0 && this.shutdownResolve) {
      this.shutdownResolve();
    }
  }

  /**
   * Called by NestJS when shutdown signal is received
   * Waits for all in-flight requests to complete
   */
  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Received shutdown signal: ${signal ?? 'unknown'}`, 'ShutdownService');
    this.isShuttingDown = true;

    if (this.inFlightRequests > 0) {
      this.logger.log(
        `Waiting for ${this.inFlightRequests} in-flight requests to complete...`,
        'ShutdownService',
      );

      await new Promise<void>(resolve => {
        this.shutdownResolve = resolve;
      });
    }

    this.logger.log('All requests completed, shutting down', 'ShutdownService');
  }
}
