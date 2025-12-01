import { registerDecorator, ValidationOptions, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { MediaInput } from '../types/media-input.type';

@ValidatorConstraint({ name: 'isMediaInput', async: false })
export class IsMediaInputConstraint implements ValidatorConstraintInterface {
    validate(value: any, args: ValidationArguments) {
        if (!value) {
            return true; // Optional field
        }

        // If it's a string, it should be a valid URL
        if (typeof value === 'string') {
            try {
                new URL(value);
                return true;
            } catch {
                return false;
            }
        }

        // If it's an object, it should have either url or fileId
        if (typeof value === 'object' && value !== null) {
            const hasUrl = typeof value.url === 'string';
            const hasFileId = typeof value.fileId === 'string';
            const hasSpoiler = value.hasSpoiler === undefined || typeof value.hasSpoiler === 'boolean';

            // Must have at least url or fileId, and hasSpoiler must be boolean if present
            return (hasUrl || hasFileId) && hasSpoiler;
        }

        return false;
    }

    defaultMessage(args: ValidationArguments) {
        return 'MediaInput must be a valid URL string or an object with url/fileId and optional hasSpoiler boolean';
    }
}

export function IsMediaInput(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsMediaInputConstraint,
        });
    };
}

@ValidatorConstraint({ name: 'isMediaInputArray', async: false })
export class IsMediaInputArrayConstraint implements ValidatorConstraintInterface {
    validate(value: any, args: ValidationArguments) {
        if (!value) {
            return true; // Optional field
        }

        if (!Array.isArray(value)) {
            return false;
        }

        const validator = new IsMediaInputConstraint();
        return value.every(item => validator.validate(item, args));
    }

    defaultMessage(args: ValidationArguments) {
        return 'Each item in media array must be a valid URL string or an object with url/fileId and optional hasSpoiler boolean';
    }
}

export function IsMediaInputArray(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsMediaInputArrayConstraint,
        });
    };
}
