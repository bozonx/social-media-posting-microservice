import { Controller, Post, Body, HttpCode, HttpStatus, Req, Logger } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { PostService } from './post.service.js';
import { PreviewService } from './preview.service.js';
import {
  PostRequestDto,
  PostResponseDto,
  ErrorResponseDto,
  PreviewResponseDto,
  PreviewErrorResponseDto,
} from './dto/index.js';

@Controller()
export class PostController {
  private readonly logger = new Logger(PostController.name);

  constructor(
    private readonly postService: PostService,
    private readonly previewService: PreviewService,
  ) {}

  @Post('post')
  @HttpCode(HttpStatus.OK)
  async publish(
    @Body() request: PostRequestDto,
    @Req() req: FastifyRequest,
  ): Promise<PostResponseDto | ErrorResponseDto> {
    const signal = this.createAbortSignal(req);
    return this.postService.publish(request, signal);
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  async preview(
    @Body() request: PostRequestDto,
  ): Promise<PreviewResponseDto | PreviewErrorResponseDto> {
    return this.previewService.preview(request);
  }
  private createAbortSignal(req: FastifyRequest): AbortSignal {
    const controller = new AbortController();
    const raw = req.raw;

    // raw.destroyed is true after body parsing - this is normal, don't abort on it
    // Only abort if raw.aborted (client disconnected before body was fully read)
    if (raw.aborted) {
      this.logger.warn('Request aborted before body parsing completed');
      controller.abort();
      return controller.signal;
    }

    const onAbort = () => {
      if (!controller.signal.aborted) {
        this.logger.warn('Aborting request due to client disconnect during processing');
        controller.abort();
      }
    };

    raw.on('aborted', onAbort);

    // Handle close event - abort only if socket closes before request completion
    raw.on('close', () => {
      // IncomingMessage emits 'close' also on normal completion.
      // Abort only if the request did not finish receiving its payload.
      if (!raw.complete) {
        onAbort();
      }
    });

    return controller.signal;
  }
}
