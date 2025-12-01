import { Test, type TestingModule } from '@nestjs/testing';
import { PostController } from '@/modules/post/post.controller';
import { PostService } from '@/modules/post/post.service';
import type { PostRequestDto, PostResponseDto, ErrorResponseDto } from '@/modules/post/dto';
import { PostType } from '@/common/enums';

describe('PostController', () => {
  let controller: PostController;
  let postService: PostService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostController],
      providers: [
        {
          provide: PostService,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PostController>(PostController);
    postService = module.get<PostService>(PostService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('publish', () => {
    it('should call service.publish with correct parameters', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        channel: 'test-channel',
        body: 'Test message',
        type: PostType.POST,
      };

      const expectedResponse: PostResponseDto = {
        success: true,
        data: {
          postId: '123',
          url: 'http://example.com',
          platform: 'telegram',
          type: PostType.POST,
          publishedAt: new Date().toISOString(),
          requestId: 'req-123',
          raw: {},
        },
      };

      (postService.publish as jest.Mock).mockResolvedValue(expectedResponse);

      const result = await controller.publish(request);

      expect(postService.publish).toHaveBeenCalledWith(request);
      expect(result).toEqual(expectedResponse);
    });

    it('should return error response from service', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
      };

      const errorResponse: ErrorResponseDto = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Error message',
          requestId: 'req-123',
        },
      };

      (postService.publish as jest.Mock).mockResolvedValue(errorResponse);

      const result = await controller.publish(request);

      expect(postService.publish).toHaveBeenCalledWith(request);
      expect(result).toEqual(errorResponse);
    });
  });
});
