import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PostService } from './post.service';
import { PreviewService } from './preview.service';
import {
  PostRequestDto,
  PostResponseDto,
  ErrorResponseDto,
  PreviewResponseDto,
  PreviewErrorResponseDto,
} from './dto';

@Controller()
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly previewService: PreviewService,
  ) {}

  @Post('post')
  @HttpCode(HttpStatus.OK)
  async publish(@Body() request: PostRequestDto): Promise<PostResponseDto | ErrorResponseDto> {
    return this.postService.publish(request);
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  async preview(
    @Body() request: PostRequestDto,
  ): Promise<PreviewResponseDto | PreviewErrorResponseDto> {
    return this.previewService.preview(request);
  }
}
