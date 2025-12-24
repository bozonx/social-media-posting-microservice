import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
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

    if (raw.destroyed || raw.aborted) {
      controller.abort();
      return controller.signal;
    }

    const onAbort = () => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    };

    raw.on('aborted', onAbort);

    // Also handle close event - if socket closes prematurely
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
