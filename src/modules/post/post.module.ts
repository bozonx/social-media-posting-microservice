import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { IdempotencyService } from './idempotency.service';
import { AppConfigModule } from '../app-config/app-config.module';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [AppConfigModule, ProvidersModule],
  controllers: [PostController],
  providers: [PostService, IdempotencyService],
})
export class PostModule {}
