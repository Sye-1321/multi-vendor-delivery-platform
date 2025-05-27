import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { ConfigModule } from '@nestjs/config';
import { RefreshTokenStrategy } from './strategies/refresh-token-strategy';
import { AccessTokenStrategy } from './strategies/access-token-strategy';

@Module({
  imports: [JwtModule.register({}), ConfigModule],
  providers: [AccessTokenStrategy, RefreshTokenStrategy, AuthService],
})
export class AuthModule {}
