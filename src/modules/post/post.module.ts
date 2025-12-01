import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { AppConfigModule } from '../app-config/app-config.module';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [AppConfigModule, ProvidersModule],
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {}
