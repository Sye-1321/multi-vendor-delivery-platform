import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ParseStringifiedJsonInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const skipNumberConversionFields = ['phoneNumber'];

    if (req.body && typeof req.body === 'object') {
      for (const key in req.body) {
        const value = req.body[key];

        if (typeof value === 'string') {
          if (value === 'true') {
            req.body[key] = true;
          } else if (value === 'false') {
            req.body[key] = false;
          } else if (
            !skipNumberConversionFields.includes(key) &&
            !Number.isNaN(+value) &&
            value.trim() !== ''
          ) {
            req.body[key] = +value;
          } else if (this.isJsonString(value)) {
            try {
              req.body[key] = JSON.parse(value);
            } catch {
              continue;
            }
          }
        }
      }
    }

    return next.handle();
  }

  private isJsonString(str: string): boolean {
    if (!str) return false;
    const trimmed = str.trim();
    return (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    );
  }
}
