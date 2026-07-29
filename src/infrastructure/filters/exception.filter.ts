import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { APIResponseMessage } from './../../application/constants/constants';
import {
  IExceptionResponse,
  IRequestException,
} from './exception-response.interface';
import { StructuredLogger } from '../logger/structured-logger.service';

@Catch()
export class ApplicationExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: StructuredLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const { statusCode, message } = this.getException(exception);
    const responseBody: IExceptionResponse = {
      isSuccess: false,
      statusCode,
      message,
      path: request.originalUrl,
      timeStamp: new Date().toISOString(),
      method: request.method,
    };
    const metadata = {
      method: request.method,
      path: request.originalUrl,
      statusCode,
    };

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error('http.request.exception', exception, metadata);
    } else {
      this.logger.warn('http.request.rejected', metadata);
    }

    response.status(statusCode).json(responseBody);
  }

  private getException(exception: unknown): IRequestException {
    if (!(exception instanceof HttpException)) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: APIResponseMessage.serverError,
      };
    }

    const statusCode = exception.getStatus();
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return { statusCode, message: response };
    }

    const errorResponse = response as {
      error?: unknown;
      message?: unknown;
    };
    const validationMessage = errorResponse.message;
    if (Array.isArray(validationMessage)) {
      return {
        statusCode,
        message: String(validationMessage[0] ?? 'Request validation failed'),
      };
    }

    if (typeof errorResponse.error === 'string') {
      return { statusCode, message: errorResponse.error };
    }

    if (typeof validationMessage === 'string') {
      return { statusCode, message: validationMessage };
    }

    return { statusCode, message: 'Request failed' };
  }
}
