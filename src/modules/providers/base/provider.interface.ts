import { PostType } from '../../../common/enums';
import { PostRequestDto } from '../../post/dto';

export interface IProvider {
    readonly name: string;
    readonly supportedTypes: PostType[];

    publish(request: PostRequestDto, channelConfig: any): Promise<any>;
}
