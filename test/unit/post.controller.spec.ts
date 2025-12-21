import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { PostController } from '@/modules/post/post.controller.js';
import { PostService } from '@/modules/post/post.service.js';
import { PreviewService } from '@/modules/post/preview.service.js';
import type {
  PostRequestDto,
  PostResponseDto,
  ErrorResponseDto,
  PreviewResponseDto,
  PreviewErrorResponseDto,
} from '@/modules/post/dto/index.js';
import { PostType, BodyFormat } from '@/common/enums/index.js';

describe('PostController', () => {
  let controller: PostController;
  let postService: PostService;
  let previewService: PreviewService;

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
        {
          provide: PreviewService,
          useValue: {
            preview: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PostController>(PostController);
    postService = module.get<PostService>(PostService);
    previewService = module.get<PreviewService>(PreviewService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('publish', () => {
    it('should call service.publish with correct parameters', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        account: 'test-channel',
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

      const mockRequest = {
        raw: {
          destroyed: false,
          aborted: false,
          on: jest.fn(),
        },
      } as any;

      const result = await controller.publish(request, mockRequest);

      expect(postService.publish).toHaveBeenCalledWith(request, expect.any(AbortSignal));
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

      const mockRequest = {
        raw: {
          destroyed: false,
          aborted: false,
          on: jest.fn(),
        },
      } as any;

      const result = await controller.publish(request, mockRequest);

      expect(postService.publish).toHaveBeenCalledWith(request, expect.any(AbortSignal));
      expect(result).toEqual(errorResponse);
    });
  });

  describe('preview', () => {
    it('should call previewService.preview with correct parameters', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        account: 'test-channel',
        body: 'Test message',
      };

      const expectedResponse: PreviewResponseDto = {
        success: true,
        data: {
          valid: true,
          detectedType: PostType.POST,
          convertedBody: 'Test message',
          targetFormat: BodyFormat.HTML,
          convertedBodyLength: 12,
          warnings: [],
        },
      };

      (previewService.preview as jest.Mock).mockResolvedValue(expectedResponse);

      const result = await controller.preview(request);

      expect(previewService.preview).toHaveBeenCalledWith(request);
      expect(result).toEqual(expectedResponse);
    });

    it('should return error response from preview service', async () => {
      const request: PostRequestDto = {
        platform: 'telegram',
        body: 'Test message',
      };

      const errorResponse: PreviewErrorResponseDto = {
        success: false,
        data: {
          valid: false,
          errors: ["Either 'account' or 'auth' must be provided"],
          warnings: [],
        },
      };

      (previewService.preview as jest.Mock).mockResolvedValue(errorResponse);

      const result = await controller.preview(request);

      expect(previewService.preview).toHaveBeenCalledWith(request);
      expect(result).toEqual(errorResponse);
    });
  });
});
