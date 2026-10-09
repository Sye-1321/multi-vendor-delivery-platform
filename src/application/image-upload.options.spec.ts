import {
  Controller,
  INestApplication,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  IMAGE_UPLOAD_OPTIONS,
  MAX_IMAGE_FILE_SIZE,
} from './image-upload.options';

let handlerReached = false;

@Controller('test-upload')
class TestUploadController {
  @Post()
  @UseInterceptors(FileInterceptor('image', IMAGE_UPLOAD_OPTIONS))
  upload() {
    handlerReached = true;
    return { uploaded: true };
  }
}

describe('IMAGE_UPLOAD_OPTIONS', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [TestUploadController],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    handlerReached = false;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a file larger than 1 MiB before the handler runs', async () => {
    await request(app.getHttpServer())
      .post('/test-upload')
      .attach('image', Buffer.alloc(MAX_IMAGE_FILE_SIZE + 1), {
        filename: 'large.png',
        contentType: 'image/png',
      })
      .expect(413);

    expect(handlerReached).toBe(false);
  });

  it('rejects an unsupported declared MIME type synchronously', async () => {
    await request(app.getHttpServer())
      .post('/test-upload')
      .attach('image', Buffer.from('plain text'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      })
      .expect(400);

    expect(handlerReached).toBe(false);
  });
});
