import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';

/**
 * Simple health check controller
 * Provides a minimal `/health` endpoint
 */
@Public()
@Controller('health')
export class HealthController {
  /**
   * Basic health check endpoint returning a simple OK status
   */
  @Get()
  public check() {
    return { status: 'ok' };
  }
}
