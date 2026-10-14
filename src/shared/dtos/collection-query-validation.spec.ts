import { Controller, Get, INestApplication, Query } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { validatePipeInstance } from 'src/infrastructure/utilities/validation-pipe-instance';
import { NotificationQueryDTO } from './notification-query.dto';
import { PaginationQueryDTO } from './pagination-query.dto';

@Controller('query-validation')
class CollectionQueryValidationController {
  @Get('ordinary')
  ordinary(@Query() query: PaginationQueryDTO) {
    return query;
  }

  @Get('notifications')
  notifications(@Query() query: NotificationQueryDTO) {
    return query;
  }
}

describe('Collection query validation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CollectionQueryValidationController],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(validatePipeInstance);
    await app.init();
  });

  afterAll(async () => app.close());

  it('transforms ordinary pagination and supplies defaults', async () => {
    await request(app.getHttpServer())
      .get('/query-validation/ordinary')
      .expect(200)
      .expect({ limit: 20, offset: 0 });
    await request(app.getHttpServer())
      .get('/query-validation/ordinary?limit=1&offset=0')
      .expect(200)
      .expect({ limit: 1, offset: 0 });
    await request(app.getHttpServer())
      .get('/query-validation/ordinary?limit=100')
      .expect(200)
      .expect({ limit: 100, offset: 0 });
  });

  it.each(['limit=0', 'limit=101', 'limit=1.5', 'offset=-1', 'offset=abc'])(
    'rejects invalid ordinary pagination: %s',
    async (query) => {
      await request(app.getHttpServer())
        .get(`/query-validation/ordinary?${query}`)
        .expect(400);
    },
  );

  it('validates notification limits and ObjectId cursors', async () => {
    await request(app.getHttpServer())
      .get('/query-validation/notifications?limit=1')
      .expect(200);
    await request(app.getHttpServer())
      .get('/query-validation/notifications?limit=50')
      .expect(200);
    await request(app.getHttpServer())
      .get('/query-validation/notifications?limit=51')
      .expect(400);
    await request(app.getHttpServer())
      .get('/query-validation/notifications?before=not-an-object-id')
      .expect(400);
  });
});
