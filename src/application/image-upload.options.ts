import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const MAX_IMAGE_FILE_SIZE = 1 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
] as const;

type BoundedMulterOptions = MulterOptions & {
  limits: NonNullable<MulterOptions['limits']> & {
    fieldNestingDepth: number;
    fieldArrayIndexLimit: number;
  };
};

export const IMAGE_UPLOAD_OPTIONS: BoundedMulterOptions = {
  limits: {
    fileSize: MAX_IMAGE_FILE_SIZE,
    fields: 32,
    files: 2,
    parts: 36,
    fieldNestingDepth: 4,
    fieldArrayIndexLimit: 100,
  },
  fileFilter: (_request, file, callback) => {
    if (
      !ALLOWED_IMAGE_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
      )
    ) {
      callback(new BadRequestException('Unsupported file type'), false);
      return;
    }

    callback(null, true);
  },
};
