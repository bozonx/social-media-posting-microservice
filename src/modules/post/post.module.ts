import { Module } from '@nestjs/common';
import { PostController } from './post.controller.js';
import { PostService } from './post.service.js';
import { PreviewService } from './preview.service.js';
import { IdempotencyService } from './idempotency.service.js';
import { AppConfigModule } from '../app-config/app-config.module.js';
import { ProvidersModule } from '../providers/providers.module.js';

@Module({
  imports: [AppConfigModule, ProvidersModule],
  controllers: [PostController],
  providers: [PostService, PreviewService, IdempotencyService],
})
export class PostModule {}
