import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable, tap } from 'rxjs';
import { Result } from 'src/domain/result/result';

@Injectable()
export class ResultHttpStatusInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      tap((value) => {
        if (
          value instanceof Result &&
          !value.isSuccess &&
          value.errorCode !== undefined
        ) {
          response.status(value.errorCode);
        }
      }),
    );
  }
}
