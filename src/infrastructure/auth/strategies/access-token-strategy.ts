import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TYPES } from 'src/application/constants/types';
import { IContextService } from 'src/infrastructure/context/context-service.interface';
import { IJwtPayload } from '../interfaces/auth.interface';
import { AccountAccessService } from '../account-access.service';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor(
    private readonly configService: ConfigService,
    @Inject(TYPES.IContextService)
    private readonly contextService: IContextService,
    private readonly accountAccess: AccountAccessService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET'),
    });
  }

  async validate(payload: IJwtPayload): Promise<IJwtPayload> {
    const userId = payload.sub?.toString();
    if (!userId || !(await this.accountAccess.isActive(userId))) {
      throw new UnauthorizedException('Access denied');
    }

    this.contextService.setPrincipal({
      userId,
      email: payload.email,
      role: payload.role,
    });

    return payload;
  }
}
