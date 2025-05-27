import { promises as fs } from 'fs';
import * as fsStream from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as stream from 'stream';
import { promisify } from 'util';
import { throwApplicationError } from 'src/infrastructure/utilities/exception-instance';

const pipeline = promisify(stream.pipeline);
const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');
const MAX_FILE_SIZE = 1 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

export async function SaveFileLocally(
  file: Express.Multer.File,
  category: string,
): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throwApplicationError(400, 'Unsupported file type');
  }

  if (file.size > MAX_FILE_SIZE) {
    throwApplicationError(400, 'File size exceeds the 1MB limit');
  }

  const uploadDir = path.join(UPLOADS_ROOT, category);
  await fs.mkdir(uploadDir, { recursive: true });

  const extension = path.extname(file.originalname).toLowerCase();
  const sanitizedFilename = uuidv4() + extension;
  const filepath = path.join(uploadDir, sanitizedFilename);

  const readStream = stream.Readable.from(file.buffer);
  const writeStream = fsStream.createWriteStream(filepath);
  await pipeline(readStream, writeStream);
  return path.posix.join(category, sanitizedFilename);
}
