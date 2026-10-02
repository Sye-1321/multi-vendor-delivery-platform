import * as nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmailService } from './interfaces/email-service.interface';
import { User } from 'src/user/user';
import { HttpStatus } from '@nestjs/common';
import { throwApplicationError } from '../utilities/exception-instance';
import {
  APIResponseMessage,
  BASE_URL,
  EmailSubjects,
  URLPaths,
} from 'src/application/constants/constants';
import { Result } from 'src/domain/result/result';
import { StructuredLogger } from '../logger/structured-logger.service';

@Injectable()
export class EmailService implements IEmailService {
  private transporter;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: StructuredLogger,
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });
  }

  private generateVerificationUrl(token: string, path: string): string {
    return `${BASE_URL}${path}/${token}`;
  }

  async sendAccountVerificationEmail(
    user: User,
    token: string,
  ): Promise<Result<void>> {
    const url = this.generateVerificationUrl(token, URLPaths.verifyEmail);
    const message = `Dear ${user.name},\n\nPlease verify your email address by clicking the link below:\n${url}\n\nBest regards,\nAlmostThere Delivery Company.`;
    const result = await this.sendEmail(
      user.email,
      EmailSubjects.emailVerification,
      message,
    );
    if (!result.isSuccess)
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        APIResponseMessage.emailVerificationError,
      );
    return Result.ok<void>(
      undefined,
      'Verification email has been successfully sent.',
    );
  }

  async sendRegistrationCompletionEmail(
    user: User,
    token: string,
  ): Promise<Result<void>> {
    const url = this.generateVerificationUrl(token, URLPaths.verifyEmail);
    const message = `Dear ${user.name},\n\nTo complete your registration, please click the link below to set a secure password:\n${url}\nIf you did not register, please disregard this email.\n\nBest regards,\nAlmostThere Delivery Company.`;
    const result = await this.sendEmail(
      user.email,
      EmailSubjects.completeRegistration,
      message,
    );
    if (!result.isSuccess)
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        APIResponseMessage.emailVerificationError,
      );
    return Result.ok<void>(
      undefined,
      'Registration completion email has been successfully sent to new email.',
    );
  }

  async sendPasswordResetInstructionsEmail(
    user: User,
    token: string,
  ): Promise<Result<void>> {
    const url = this.generateVerificationUrl(
      token,
      URLPaths.passwordResetConfirm,
    );
    const message = `Dear ${user.name},\n\nTo reset your password, please click the link below:\n${url}\n\nBest regards,\nAlmostThere Delivery Company.`;
    const result = await this.sendEmail(
      user.email,
      EmailSubjects.passwordReset,
      message,
    );
    if (!result.isSuccess)
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        APIResponseMessage.emailVerificationError,
      );
    return Result.ok<void>(
      undefined,
      'Password reset instructions have been successfully sent.',
    );
  }

  async sendEmailChangeConfirmationEmail(
    user: User,
    newEmail: string,
    token: string,
  ): Promise<Result<void>> {
    const url = this.generateVerificationUrl(token, URLPaths.verifyNewEmail);
    const message = `Dear ${user.name},\n\nTo confirm your email change, please click the link below:\n${url}\n\nBest regards,\nAlmostThere Delivery Company.`;
    const result = await this.sendEmail(
      newEmail,
      EmailSubjects.emailChange,
      message,
    );
    if (!result.isSuccess)
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        APIResponseMessage.emailVerificationError,
      );
    return Result.ok<void>(
      undefined,
      'Email change confirmation email has been successfully sent.',
    );
  }

  private async sendEmail(
    to: string,
    subject: string,
    message: string,
  ): Promise<Result<void>> {
    try {
      const from = this.configService.get<string>('SMTP_USER');

      this.logger.info('email.delivery.started', {
        subject,
      });

      await this.transporter.sendMail({ from, to, subject, text: message });
      this.logger.info('email.delivery.completed', { subject });

      return Result.ok<void>(undefined, 'Email has been successfully sent.');
    } catch (error) {
      this.logger.error('email.delivery.failed', error, { subject });

      return Result.fail<void>(
        `An error occurred while sending the email: ${error?.message || 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
