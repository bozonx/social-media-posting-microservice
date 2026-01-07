import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ShutdownService } from '@/common/services/shutdown.service.js';

describe('ShutdownService', () => {
  let service: ShutdownService;
  let logSpy: ReturnType<typeof jest.spyOn>;
  let warnSpy: ReturnType<typeof jest.spyOn>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let debugSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(async () => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    debugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [ShutdownService],
    }).compile();

    service = module.get<ShutdownService>(ShutdownService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('shuttingDown', () => {
    it('should return false initially', () => {
      expect(service.shuttingDown).toBe(false);
    });

    it('should return true after onApplicationShutdown is called', async () => {
      const shutdownPromise = service.onApplicationShutdown('SIGTERM');

      expect(service.shuttingDown).toBe(true);

      await shutdownPromise;
    });
  });

  describe('trackRequest / untrackRequest', () => {
    it('should track and untrack requests', () => {
      service.trackRequest();
      service.trackRequest();
      service.untrackRequest();

      // No direct way to check count, but we can verify shutdown waits
      expect(service.shuttingDown).toBe(false);
    });

    it('should return correct in-flight requests count', () => {
      expect(service.getInFlightRequestsCount()).toBe(0);

      service.trackRequest();
      expect(service.getInFlightRequestsCount()).toBe(1);

      service.trackRequest();
      expect(service.getInFlightRequestsCount()).toBe(2);

      service.untrackRequest();
      expect(service.getInFlightRequestsCount()).toBe(1);

      service.untrackRequest();
      expect(service.getInFlightRequestsCount()).toBe(0);
    });
  });

  describe('onApplicationShutdown', () => {
    it('should resolve immediately when no in-flight requests', async () => {
      await service.onApplicationShutdown('SIGTERM');

      expect(logSpy).toHaveBeenCalledWith(
        'Received shutdown signal: SIGTERM. In-flight requests: 0',
        'ShutdownService',
      );
      expect(logSpy).toHaveBeenCalledWith(
        'No in-flight requests, shutting down immediately',
        'ShutdownService',
      );
    });

    it('should wait for in-flight requests to complete', async () => {
      service.trackRequest();
      service.trackRequest();

      let resolved = false;
      const shutdownPromise = service.onApplicationShutdown('SIGINT').then(() => {
        resolved = true;
      });

      // Should not resolve yet
      await Promise.resolve();
      expect(resolved).toBe(false);
      expect(logSpy).toHaveBeenCalledWith(
        'Waiting for 2 in-flight requests to complete...',
        'ShutdownService',
      );

      // Complete first request
      service.untrackRequest();
      await Promise.resolve();
      expect(resolved).toBe(false);

      // Complete second request
      service.untrackRequest();
      await shutdownPromise;
      expect(resolved).toBe(true);
    });

    it('should handle unknown signal', async () => {
      await service.onApplicationShutdown();

      expect(logSpy).toHaveBeenCalledWith(
        'Received shutdown signal: unknown. In-flight requests: 0',
        'ShutdownService',
      );
    });

    it('should timeout if requests take too long', async () => {
      jest.useFakeTimers();

      service.trackRequest();

      const shutdownPromise = service.onApplicationShutdown('SIGTERM');

      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(30000);

      await shutdownPromise;

      expect(warnSpy).toHaveBeenCalledWith(
        'Shutdown timeout reached. Remaining in-flight requests: 1',
        'ShutdownService',
      );

      jest.useRealTimers();
    });
  });

  describe('onModuleDestroy', () => {
    it('should cleanup state', () => {
      service.trackRequest();
      service.trackRequest();

      expect(service.getInFlightRequestsCount()).toBe(2);

      service.onModuleDestroy();

      expect(service.getInFlightRequestsCount()).toBe(0);
      expect(service.shuttingDown).toBe(false);
    });
  });
});
