import { Injectable } from '@nestjs/common';
import { PostRequestDto } from '../../post/dto/index.js';
import { PostType } from '../../../common/enums/index.js';
import { MediaInputHelper } from '../../../common/helpers/media-input.helper.js';
import { MediaPriorityValidator } from '../../../common/validators/media-priority.validator.js';

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

    // Priority 1-4: Check primary media fields (ALBUM, DOCUMENT, AUDIO, VIDEO)
    const primaryType = MediaPriorityValidator.detectPrimaryMediaField(request);
    if (primaryType) {
      return primaryType;
    }

    // Priority 5: cover -> IMAGE
    if (MediaInputHelper.isDefined(request.cover)) {
      return PostType.IMAGE;
    }

    // Priority 6: no media -> POST
    return PostType.POST;
  }
}
