import { Module, forwardRef } from '@nestjs/common';
import { PostController } from './post.controller.js';
import { PostService } from './post.service.js';
import { PreviewService } from './preview.service.js';
import { IdempotencyService } from './idempotency.service.js';
import { AppConfigModule } from '../app-config/app-config.module.js';
import { PlatformsModule } from '../platforms/platforms.module.js';
import { AppModule } from '../../app.module.js';

@Module({
  imports: [AppConfigModule, PlatformsModule, forwardRef(() => AppModule)],
  controllers: [PostController],
  providers: [PostService, PreviewService, IdempotencyService],
})
export class PostModule { }
