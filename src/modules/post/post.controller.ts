import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PostService } from './post.service';
import { PostRequestDto, PostResponseDto, ErrorResponseDto } from './dto';

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async publish(@Body() request: PostRequestDto): Promise<PostResponseDto | ErrorResponseDto> {
    return this.postService.publish(request);
  }
}
