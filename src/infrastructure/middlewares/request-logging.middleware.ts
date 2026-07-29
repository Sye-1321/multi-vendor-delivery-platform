import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { StructuredLogger } from '../logger/structured-logger.service';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: StructuredLogger) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const startedAt = process.hrtime.bigint();

    response.once('finish', () => {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const metadata = {
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        outcome: response.statusCode >= 400 ? 'failure' : 'success',
      };

      this.logger.info('http.request.completed', metadata);
    });

    next();
  }
}
