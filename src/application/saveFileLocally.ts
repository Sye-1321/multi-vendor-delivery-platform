import { promises as fs } from 'fs';
import * as fsStream from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as stream from 'stream';
import { promisify } from 'util';
import { throwApplicationError } from 'src/infrastructure/utilities/exception-instance';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE,
} from './image-upload.options';

const pipeline = promisify(stream.pipeline);
const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');

const IMAGE_FORMATS = [
  {
    mimetype: 'image/jpeg',
    extension: '.jpg',
    signature: Buffer.from([0xff, 0xd8, 0xff]),
  },
  {
    mimetype: 'image/png',
    extension: '.png',
    signature: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    mimetype: 'image/gif',
    extension: '.gif',
    signature: Buffer.from('GIF87a'),
  },
  {
    mimetype: 'image/gif',
    extension: '.gif',
    signature: Buffer.from('GIF89a'),
  },
] as const;

export async function SaveFileLocally(
  file: Express.Multer.File | undefined,
  category: string,
): Promise<string> {
  if (!file) {
    return throwApplicationError(400, 'Image file is required');
  }

  if (
    !ALLOWED_IMAGE_MIME_TYPES.includes(
      file.mimetype as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
    )
  ) {
    return throwApplicationError(400, 'Unsupported file type');
  }

  if (
    file.size > MAX_IMAGE_FILE_SIZE ||
    file.buffer.length > MAX_IMAGE_FILE_SIZE
  ) {
    return throwApplicationError(400, 'File size exceeds the 1MB limit');
  }

  const imageFormat = IMAGE_FORMATS.find(({ signature }) =>
    file.buffer.subarray(0, signature.length).equals(signature),
  );
  if (!imageFormat || imageFormat.mimetype !== file.mimetype) {
    return throwApplicationError(
      400,
      'File content does not match its declared type',
    );
  }

  const uploadDir = path.join(UPLOADS_ROOT, category);
  await fs.mkdir(uploadDir, { recursive: true });

  const sanitizedFilename = uuidv4() + imageFormat.extension;
  const filepath = path.join(uploadDir, sanitizedFilename);

  const readStream = stream.Readable.from(file.buffer);
  const writeStream = fsStream.createWriteStream(filepath);
  try {
    await pipeline(readStream, writeStream);
  } catch (error) {
    await fs.rm(filepath, { force: true }).catch(() => undefined);
    throw error;
  }
  return path.posix.join(category, sanitizedFilename);
}
