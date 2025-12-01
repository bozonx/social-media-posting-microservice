import { Injectable } from '@nestjs/common';
import { PostRequestDto } from '../../post/dto';
import { PostType } from '../../../common/enums';
import { MediaInputHelper } from '../../../common/helpers/media-input.helper';

/**
 * Service for determining message type for Telegram
 */
@Injectable()
export class TelegramTypeDetector {
  /**
   * Determine Telegram message type based on request data
   * Priority order:
   * 1. media[] -> ALBUM
   * 2. document -> DOCUMENT
   * 3. audio -> AUDIO
   * 4. video -> VIDEO
   * 5. cover -> IMAGE
   * 6. no media -> POST
   */
  detectType(request: PostRequestDto): PostType {
    // If type is explicitly set and not AUTO, return it
    if (request.type && request.type !== PostType.AUTO) {
      return request.type;
    }

    // Priority 1: media[] -> ALBUM
    if (MediaInputHelper.isNotEmpty(request.media)) {
      return PostType.ALBUM;
    }

    // Priority 2: document -> DOCUMENT
    if (MediaInputHelper.isDefined(request.document)) {
      return PostType.DOCUMENT;
    }

    // Priority 3: audio -> AUDIO
    if (MediaInputHelper.isDefined(request.audio)) {
      return PostType.AUDIO;
    }

    // Priority 4: video -> VIDEO
    if (MediaInputHelper.isDefined(request.video)) {
      return PostType.VIDEO;
    }

    // Priority 5: cover -> IMAGE
    if (MediaInputHelper.isDefined(request.cover)) {
      return PostType.IMAGE;
    }

    // Priority 6: no media -> POST
    return PostType.POST;
  }
}
