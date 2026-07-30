import { IContextService } from './../context/context-service.interface';
import { TYPES } from './../../application/constants/types';
import { APIResponseMessage } from './../../application/constants/constants';
import { Regex } from './../utilities/regex';
import {
  BadRequestException,
  Inject,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Context } from '../context/context';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(
    @Inject(TYPES.IContextService)
    private readonly contextService: IContextService,
    private readonly configService: ConfigService,
  ) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const suppliedCorrelationId = request.get(
      APIResponseMessage.correlationIdHeader,
    );

    if (suppliedCorrelationId && !Regex.isUUID(suppliedCorrelationId)) {
      throw new BadRequestException(APIResponseMessage.invalidCorrelationId);
    }

    const correlationId = suppliedCorrelationId ?? uuidv4();
    const guestEmail = this.configService.getOrThrow<string>('GUEST_EMAIL');

    request.headers[APIResponseMessage.correlationIdHeader] = correlationId;
    response.setHeader(APIResponseMessage.correlationIdHeader, correlationId);

    this.contextService.run(new Context(guestEmail, correlationId), next);
  }
}
