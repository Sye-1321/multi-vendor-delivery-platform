import { IContextService } from './../context/context-service.interface';
import { TYPES } from './../../application/constants/types';
import { APIResponseMessage } from './../../application/constants/constants';
import { Regex } from './../utilities/regex';
import { HttpStatus, Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Context } from '../context/context';
import { throwApplicationError } from '../utilities/exception-instance';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class ContextMiddleWare implements NestMiddleware {
  constructor(
    @Inject(TYPES.IContextService)
    private readonly contextService: IContextService,
    private readonly configService: ConfigService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const headers = req.headers;
    const errors: Record<string, string> = {};
    if (!headers[APIResponseMessage.correlationIdHeader]) {
      req.headers[APIResponseMessage.correlationIdHeader] = uuidv4();
    }
    if (headers[APIResponseMessage.emailHeader]) {
      const emailHeader = headers[APIResponseMessage.emailHeader] as string;
      if (!Regex.isEmail(emailHeader)) {
        errors.email = APIResponseMessage.invalidEmailHeaderError;
      }
    }
    if (typeof headers[APIResponseMessage.correlationIdHeader] !== 'string') {
      errors.correlationId = APIResponseMessage.invalidCorrelationId;
    }
    if (Object.keys(errors).length) {
      throwApplicationError(HttpStatus.BAD_REQUEST, JSON.stringify(errors));
    }
    const authHeader =
      (headers[APIResponseMessage.authorizationHeader] as string) || '';
    let token = '';
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      } else {
        token = authHeader;
      }
    } else {
      throwApplicationError(
        HttpStatus.UNAUTHORIZED,
        APIResponseMessage.invalidToken,
      );
    }

    let email = this.configService.get<string>('GUEST_EMAIL') || '';
    let role = '';

    if (token) {
      try {
        const secret = this.configService.get<string>(
          'JWT_ACCESS_TOKEN_SECRET',
        ) as string;
        const decoded = jwt.verify(token, secret) as any;
        email = decoded.email || email;
        role = decoded.role || '';
      } catch (error) {
        throwApplicationError(
          HttpStatus.UNAUTHORIZED,
          APIResponseMessage.invalidToken,
        );
      }
    }

    const correlationId = headers[
      APIResponseMessage.correlationIdHeader
    ] as string;
    const context: Context = new Context(email, correlationId, token, role);
    this.contextService.setContext(context);
    next();
  }
}
