import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TYPES } from 'src/application/constants/types';
import { IContextService } from 'src/infrastructure/context/context-service.interface';
import { IJwtPayload } from '../interfaces/auth.interface';

export type RefreshTokenPrincipal = IJwtPayload & { token: string };

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly configService: ConfigService,
    @Inject(TYPES.IContextService)
    private readonly contextService: IContextService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_TOKEN_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(request: Request, payload: IJwtPayload): RefreshTokenPrincipal {
    const authHeader = request.get('authorization') || '';
    const token = authHeader.replace('Bearer', '').trim();

    this.contextService.setPrincipal(
      {
        userId: payload.sub.toString(),
        email: payload.email,
        role: payload.role,
      },
      token,
    );

    return {
      ...payload,
      token,
    };
  }
}
