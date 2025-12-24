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

    this.logger.debug({
      message: 'Creating AbortSignal',
      metadata: {
        destroyed: raw.destroyed,
        aborted: raw.aborted,
        complete: raw.complete,
        readableEnded: raw.readableEnded,
      },
    });

    if (raw.destroyed || raw.aborted) {
      this.logger.warn({
        message: 'Request already destroyed/aborted at signal creation',
        metadata: { destroyed: raw.destroyed, aborted: raw.aborted },
      });
      controller.abort();
      return controller.signal;
    }

    const onAbort = () => {
      if (!controller.signal.aborted) {
        this.logger.warn({
          message: 'Aborting request due to client disconnect',
          metadata: {
            destroyed: raw.destroyed,
            aborted: raw.aborted,
            complete: raw.complete,
          },
        });
        controller.abort();
      }
    };

    raw.on('aborted', () => {
      this.logger.warn('raw.on(aborted) event fired');
      onAbort();
    });

    // Also handle close event - if socket closes prematurely
    raw.on('close', () => {
      this.logger.debug({
        message: 'raw.on(close) event fired',
        metadata: { complete: raw.complete, aborted: raw.aborted },
      });
      // IncomingMessage emits 'close' also on normal completion.
      // Abort only if the request did not finish receiving its payload.
      if (!raw.complete) {
        this.logger.warn('Aborting on close: request incomplete');
        onAbort();
      }
    });

    return controller.signal;
  }
}
