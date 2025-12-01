import type { PostType } from '../../../common/enums';
import type { PostRequestDto, PreviewResponseDto, PreviewErrorResponseDto } from '../../post/dto';

export interface ProviderPublishResponse {
  postId: string;
  url?: string;
  raw?: Record<string, any>;
}

export interface IProvider {
  readonly name: string;
  readonly supportedTypes: PostType[];

  publish(request: PostRequestDto, channelConfig: any): Promise<ProviderPublishResponse>;
  preview(
    request: PostRequestDto,
    channelConfig: any,
  ): Promise<PreviewResponseDto | PreviewErrorResponseDto>;
}
