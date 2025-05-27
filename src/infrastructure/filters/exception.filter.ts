// application-exceptions.filter.ts
import { ArgumentsHost, Catch, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request } from 'express';
import { APIResponseMessage } from './../../application/constants/constants';
import { IExceptionResponse, IRequestException } from './exception-response.interface';
import { LoggerService } from './logger.service';

@Catch()
export class ApplicationExceptionsFilter extends BaseExceptionFilter {
  constructor(private readonly logger: LoggerService) {
    super();
  }

  catch(exception: any, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse();
    const request = context.getRequest<Request>();
    const { body } = request;
    let props: any;
    if (body && Object.hasOwnProperty.call(body, 'password')) {
      const { password, ...prop } = body;
      props = prop;
    }
    const { statusCode, message } = this.getException(exception);
    const responseBody: IExceptionResponse = {
      isSuccess: false,
      statusCode,
      message,
      path: request.originalUrl,
      timeStamp: new Date().toISOString(),
      method: request.method,
      body: body && Object.hasOwnProperty.call(body, 'password') ? props : body,
    };
    this.logErrorMessage(request, JSON.stringify(responseBody), statusCode, exception);
    const errorLog: string = this.constructErrorMessage(responseBody, request, exception);
    this.logger.error(errorLog);
    response.status(statusCode).json(responseBody);
    return exception;
  }

  private getException(exception: any): IRequestException {
    let statusCode: number;
    let message: string;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const errorResponse: any = exception.getResponse();

      if (
        typeof errorResponse === 'object' &&
        errorResponse.message &&
        Array.isArray(errorResponse.message)
      ) {
        message = errorResponse.message[0];
      } else if (typeof errorResponse === 'object' && errorResponse.error) {
        message = errorResponse.error;
      } else {
        message = errorResponse;
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = APIResponseMessage.serverError;
    }

    return { statusCode, message };
  }

  private logErrorMessage(request: Request, message: string, statusCode: number, exception: any) {
    if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR || statusCode === HttpStatus.NOT_FOUND) {
      this.logger.error(
        `End Request for ${request.path} method=${request.method} statusCode=${statusCode} message=${message} ${exception.stack ?? ''}`
      );
    } else {
      this.logger.warn(
        `End Request for ${request.path} method=${request.method} statusCode=${statusCode} message=${message}`
      );
    }
  }

  private constructErrorMessage(errorResponse: IExceptionResponse, request: Request, exception: unknown): string {
    const { statusCode } = errorResponse;
    const { url, method } = request;
    return `Response Code: ${statusCode} - Method: ${method} - URL: ${url}\n\n${JSON.stringify(errorResponse)}\n${exception instanceof HttpException ? exception.stack : exception}`;
  }
}
