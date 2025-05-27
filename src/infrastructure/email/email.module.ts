import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email-service';
import { JwtModule } from '@nestjs/jwt';
import { TYPES } from 'src/application/constants/types';
import { AuthService } from '../auth/auth.service';

@Module({
  imports: [
    JwtModule.register({ secret: 'your-secret-key' }),
    ConfigModule,
  ],
  providers: [
    { provide: TYPES.IEmailService, useClass: EmailService },
    { provide: TYPES.IAuthService, useClass: AuthService },
  ],
})
export class EmailModule {}
