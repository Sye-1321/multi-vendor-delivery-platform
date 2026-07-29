import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TYPES } from 'src/application/constants/types';
import { IContextService } from 'src/infrastructure/context/context-service.interface';
import { IJwtPayload } from '../interfaces/auth.interface';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor(
    private readonly configService: ConfigService,
    @Inject(TYPES.IContextService)
    private readonly contextService: IContextService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET'),
    });
  }

  validate(payload: IJwtPayload): IJwtPayload {
    this.contextService.setPrincipal({
      userId: payload.sub.toString(),
      email: payload.email,
      role: payload.role,
    });

    return payload;
  }
}
