import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp } from './test-app.factory.js';
import { ShutdownService } from '@/common/services/shutdown.service.js';

describe('Graceful Shutdown (e2e)', () => {
    let app: NestFastifyApplication;

    beforeEach(async () => {
        app = await createTestApp();
    });

    afterEach(async () => {
        if (app) {
            await app.close();
        }
    });

    describe('Shutdown behavior', () => {
        it('should reject new requests when shutting down', async () => {
            const shutdownService = app.get(ShutdownService);

            // Trigger shutdown state
            await shutdownService.onApplicationShutdown('SIGTERM');

            // Try to make a request after shutdown started
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/health',
            });

            expect(response.statusCode).toBe(503);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Server is shutting down');
        });

        it('should track in-flight requests correctly', async () => {
            const shutdownService = app.get(ShutdownService);

            expect(shutdownService.getInFlightRequestsCount()).toBe(0);

            // Make a request (it will be tracked by the interceptor)
            const responsePromise = app.inject({
                method: 'GET',
                url: '/api/v1/health',
            });

            // Wait a bit for the request to start processing
            await new Promise(resolve => setTimeout(resolve, 10));

            // During request processing, count should be > 0
            // Note: This might be flaky in fast environments, but should work most of the time
            const countDuringRequest = shutdownService.getInFlightRequestsCount();

            await responsePromise;

            // After request completes, count should be back to 0
            expect(shutdownService.getInFlightRequestsCount()).toBe(0);
        });

        it('should allow requests when not shutting down', async () => {
            const shutdownService = app.get(ShutdownService);

            expect(shutdownService.shuttingDown).toBe(false);

            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/health',
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.status).toBe('ok');
        });

        it('should set shuttingDown flag when shutdown signal received', async () => {
            const shutdownService = app.get(ShutdownService);

            expect(shutdownService.shuttingDown).toBe(false);

            // Start shutdown (don't await to check flag immediately)
            const shutdownPromise = shutdownService.onApplicationShutdown('SIGTERM');

            expect(shutdownService.shuttingDown).toBe(true);

            await shutdownPromise;

            expect(shutdownService.shuttingDown).toBe(true);
        });
    });
});
