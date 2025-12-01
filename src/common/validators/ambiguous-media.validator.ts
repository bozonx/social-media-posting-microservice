import { BadRequestException } from '@nestjs/common';
import { PostRequestDto } from '../../modules/post/dto/post-request.dto';
import { PostType } from '../enums';
import { MediaInputHelper } from '../helpers/media-input.helper';

/**
 * Validator for ambiguous media fields
 * Ensures that only one media type is specified when type is AUTO
 */
export class AmbiguousMediaValidator {
    /**
     * Validate that request doesn't have ambiguous media fields
     * @throws BadRequestException if multiple media types are specified
     */
    static validate(request: PostRequestDto): void {
        // Only validate for AUTO type
        if (request.type !== PostType.AUTO && request.type !== undefined) {
            return;
        }

        const mediaFields: string[] = [];

        // media[] has highest priority, ignore others
        if (MediaInputHelper.isNotEmpty(request.media)) {
            return;
        }

        // Check which media fields are defined
        if (MediaInputHelper.isDefined(request.document)) {
            mediaFields.push('document');
        }
        if (MediaInputHelper.isDefined(request.audio)) {
            mediaFields.push('audio');
        }
        if (MediaInputHelper.isDefined(request.video)) {
            mediaFields.push('video');
        }
        if (MediaInputHelper.isDefined(request.cover)) {
            mediaFields.push('cover');
        }

        // If more than one media field is defined, throw error
        if (mediaFields.length > 1) {
            throw new BadRequestException(
                `Ambiguous media fields: cannot use ${mediaFields.map(f => `'${f}'`).join(' and ')} together. ` +
                `Please specify only one media type or set explicit 'type'.`
            );
        }
    }
}
