import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { ShutdownService } from '@/common/services/shutdown.service.js';

describe('ShutdownService', () => {
  let service: ShutdownService;
  let mockLogger: { log: jest.Mock };

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShutdownService,
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ShutdownService>(ShutdownService);
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

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Received shutdown signal: SIGTERM',
        'ShutdownService',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'All requests completed, shutting down',
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
      expect(mockLogger.log).toHaveBeenCalledWith(
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

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Received shutdown signal: unknown',
        'ShutdownService',
      );
    });
  });
});
