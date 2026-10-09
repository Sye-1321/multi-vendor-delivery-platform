import {
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  INestApplication,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { lastValueFrom, of } from 'rxjs';
import request from 'supertest';
import { APIResponseMessage } from 'src/application/constants/constants';
import { Result } from 'src/domain/result/result';
import { ApplicationExceptionsFilter } from '../filters/exception.filter';
import { ResultHttpStatusInterceptor } from './result-http-status.interceptor';

@Controller('result-contract')
class ResultContractController {
  @Get('failed')
  failed() {
    return Result.fail('Missing', HttpStatus.NOT_FOUND);
  }

  @Post('failed-created')
  @HttpCode(HttpStatus.CREATED)
  failedCreated() {
    return Result.fail('Persistence failed', HttpStatus.INTERNAL_SERVER_ERROR);
  }

  @Post('created')
  @HttpCode(HttpStatus.CREATED)
  created() {
    return Result.ok({ id: 'created' });
  }

  @Get('not-found')
  notFound(): never {
    throw new NotFoundException('Not found');
  }

  @Get('forbidden')
  forbidden(): never {
    throw new ForbiddenException('Forbidden');
  }

  @Get('duplicate')
  duplicate(): never {
    const error = new Error('do not expose this') as Error & {
      code: number;
      keyValue: { name: string };
    };
    error.code = 11000;
    error.keyValue = { name: 'sensitive-value' };
    throw error;
  }

  @Get('unexpected')
  unexpected(): never {
    throw new Error('internal database secret/details');
  }
}

describe('Result HTTP status boundary', () => {
  let app: INestApplication;
  const logger = {
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ResultContractController],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalInterceptors(new ResultHttpStatusInterceptor());
    app.useGlobalFilters(new ApplicationExceptionsFilter(logger as never));
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => app.close());

  it('uses a failed Result error code without changing its envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/result-contract/failed')
      .expect(404);

    expect(response.body).toMatchObject({
      isSuccess: false,
      message: 'Missing',
      errorCode: 404,
    });
  });

  it('overrides a CREATED route only when its Result failed', async () => {
    await request(app.getHttpServer())
      .post('/result-contract/failed-created')
      .expect(500)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          isSuccess: false,
          message: 'Persistence failed',
          errorCode: 500,
        });
      });
    await request(app.getHttpServer())
      .post('/result-contract/created')
      .expect(201);
  });

  it('preserves HttpException statuses', async () => {
    await request(app.getHttpServer())
      .get('/result-contract/not-found')
      .expect(404);
    await request(app.getHttpServer())
      .get('/result-contract/forbidden')
      .expect(403);
  });

  it('maps duplicate keys to a private 409 response and warning log', async () => {
    const response = await request(app.getHttpServer())
      .get('/result-contract/duplicate')
      .expect(409);

    expect(response.body.message).toBe('Resource already exists.');
    expect(JSON.stringify(response.body)).not.toContain('sensitive-value');
    expect(JSON.stringify(response.body)).not.toContain('do not expose this');
    expect(JSON.stringify(response.body)).not.toContain('keyValue');
    expect(logger.warn).toHaveBeenCalledWith(
      'http.request.rejected',
      expect.objectContaining({ statusCode: 409 }),
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('keeps unexpected exception details private and logs the original', async () => {
    const response = await request(app.getHttpServer())
      .get('/result-contract/unexpected')
      .expect(500);

    expect(response.body.message).toBe(APIResponseMessage.serverError);
    expect(JSON.stringify(response.body)).not.toContain(
      'internal database secret/details',
    );
    expect(logger.error).toHaveBeenCalledWith(
      'http.request.exception',
      expect.any(Error),
      expect.objectContaining({ statusCode: 500 }),
    );
  });

  it('does not access an HTTP response in a non-HTTP context', async () => {
    const interceptor = new ResultHttpStatusInterceptor();
    const next = { handle: jest.fn(() => of(Result.fail('Missing', 404))) };
    const context = {
      getType: () => 'ws',
      switchToHttp: () => {
        throw new Error('HTTP context should not be accessed');
      },
    } as unknown as ExecutionContext;

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).resolves.toBeInstanceOf(Result);
  });
});
