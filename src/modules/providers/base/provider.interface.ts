import type { PostType } from '../../../common/enums';
import type { PostRequestDto } from '../../post/dto';

export interface IProvider {
  readonly name: string;
  readonly supportedTypes: PostType[];

  publish(request: PostRequestDto, channelConfig: any): Promise<any>;
}
