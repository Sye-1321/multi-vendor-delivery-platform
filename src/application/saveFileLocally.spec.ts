import { promises as fs } from 'fs';
import * as path from 'path';
import { MAX_IMAGE_FILE_SIZE } from './image-upload.options';
import { DeleteFileLocally, SaveFileLocally } from './saveFileLocally';

const TEST_CATEGORY = 'test-image-uploads';
const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');
const testDirectory = path.join(uploadsRoot, TEST_CATEGORY);
const pngBuffer = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);

function file(
  buffer: Buffer,
  mimetype: string,
  originalname = 'image.bin',
): Express.Multer.File {
  return {
    fieldname: 'image',
    originalname,
    encoding: '7bit',
    mimetype,
    size: buffer.length,
    buffer,
  } as Express.Multer.File;
}

async function expectBadRequest(action: Promise<unknown>): Promise<void> {
  await expect(action).rejects.toMatchObject({ status: 400 });
}

describe('SaveFileLocally', () => {
  beforeEach(async () => {
    await fs.rm(testDirectory, { recursive: true, force: true });
  });

  afterAll(async () => {
    await fs.rm(testDirectory, { recursive: true, force: true });
  });

  it('stores a valid PNG with an extension derived from its content', async () => {
    const key = await SaveFileLocally(
      file(pngBuffer, 'image/png', 'malicious.html'),
      TEST_CATEGORY,
    );

    expect(key).toMatch(/^test-image-uploads\/[\w-]+\.png$/);
    expect(key).not.toMatch(/\.html$/);
    await expect(
      fs.access(path.join(uploadsRoot, ...key.split('/'))),
    ).resolves.toBeUndefined();
  });

  it('rejects a declared MIME type that does not match the bytes', async () => {
    await expectBadRequest(
      SaveFileLocally(file(pngBuffer, 'image/jpeg'), TEST_CATEGORY),
    );
    await expect(fs.readdir(testDirectory)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('rejects invalid image bytes', async () => {
    await expectBadRequest(
      SaveFileLocally(
        file(Buffer.from('not an image'), 'image/png'),
        TEST_CATEGORY,
      ),
    );
  });

  it('rejects a missing file with a controlled bad request', async () => {
    await expectBadRequest(SaveFileLocally(undefined, TEST_CATEGORY));
  });

  it('retains an internal size limit', async () => {
    const buffer = Buffer.alloc(MAX_IMAGE_FILE_SIZE + 1);
    pngBuffer.copy(buffer);
    await expectBadRequest(
      SaveFileLocally(file(buffer, 'image/png'), TEST_CATEGORY),
    );
  });

  it('deletes an owned file under the upload root', async () => {
    const key = await SaveFileLocally(
      file(pngBuffer, 'image/png'),
      TEST_CATEGORY,
    );

    await DeleteFileLocally(key);

    await expect(
      fs.access(path.join(uploadsRoot, ...key.split('/'))),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('tolerates a legitimate missing storage key', async () => {
    await expect(
      DeleteFileLocally(`${TEST_CATEGORY}/missing.png`),
    ).resolves.toBeUndefined();
  });

  it('does not delete a traversal target outside uploads', async () => {
    const outsideFile = path.join(__dirname, '..', '..', 'outside-upload-test');
    await fs.writeFile(outsideFile, 'keep me');

    try {
      await DeleteFileLocally('../outside-upload-test');
      await expect(fs.readFile(outsideFile, 'utf8')).resolves.toBe('keep me');
    } finally {
      await fs.rm(outsideFile, { force: true });
    }
  });
});
