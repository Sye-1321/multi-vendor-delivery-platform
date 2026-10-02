import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email-service';
import { TYPES } from 'src/application/constants/types';

@Module({
  imports: [ConfigModule],
  providers: [{ provide: TYPES.IEmailService, useClass: EmailService }],
})
export class EmailModule {}
