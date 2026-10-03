import { EventEmitter } from 'node:events';
import { Request, Response } from 'express';
import { RequestLoggingMiddleware } from './request-logging.middleware';

describe('RequestLoggingMiddleware', () => {
  it('logs useful completion metadata without a body credential', () => {
    const info = jest.fn();
    const middleware = new RequestLoggingMiddleware({ info } as never);
    const secret = 'eyJhbGciOiJIUzI1NiJ9.payload.signature';
    const request = {
      method: 'POST',
      originalUrl: '/auth/email-verification',
      body: { token: secret },
      baseUrl: '',
      route: { path: '/auth/email-verification' },
    } as Request;
    const response = new EventEmitter() as Response & EventEmitter;
    response.statusCode = 200;

    middleware.use(request, response, jest.fn());
    response.emit('finish');

    expect(info).toHaveBeenCalledWith(
      'http.request.completed',
      expect.objectContaining({
        method: 'POST',
        path: '/auth/email-verification',
        statusCode: 200,
        durationMs: expect.any(Number),
        outcome: 'success',
      }),
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain(secret);
  });
});
