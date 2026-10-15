import { HttpStatus } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { EmailService } from './email-service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('EmailService account action links', () => {
  const sendMail = jest.fn();
  const user = { name: 'Test User', email: 'user@example.com' };
  const token = 'token+/=';

  function build(accountActionBaseUrl?: string) {
    jest
      .mocked(nodemailer.createTransport)
      .mockReturnValue({ sendMail } as never);
    const config = {
      get: (key: string) =>
        ({
          ACCOUNT_ACTION_BASE_URL: accountActionBaseUrl,
          SMTP_USER: 'sender@example.com',
          SMTP_PASSWORD: 'password',
        })[key],
    };
    return new EmailService(
      config as never,
      {
        info: jest.fn(),
        error: jest.fn(),
      } as never,
    );
  }

  beforeEach(() => {
    sendMail.mockReset().mockResolvedValue(undefined);
    jest.mocked(nodemailer.createTransport).mockReset();
  });

  it('uses the configured base URL for every encoded account callback', async () => {
    const service = build('https://client.example/account/');

    await service.sendAccountVerificationEmail(user as never, token);
    await service.sendRegistrationCompletionEmail(user, token);
    await service.sendPasswordResetInstructionsEmail(user as never, token);
    await service.sendEmailChangeConfirmationEmail(
      user as never,
      'new@example.com',
      token,
    );

    const messages = sendMail.mock.calls.map(([message]) => message.text);
    expect(messages).toEqual([
      expect.stringContaining(
        'https://client.example/account/verify-email#token=token%2B%2F%3D',
      ),
      expect.stringContaining(
        'https://client.example/account/registration-completion#token=token%2B%2F%3D',
      ),
      expect.stringContaining(
        'https://client.example/account/password-reset-confirm#token=token%2B%2F%3D',
      ),
      expect.stringContaining(
        'https://client.example/account/verify-new-email#token=token%2B%2F%3D',
      ),
    ]);
    expect(messages[0]).toBe(
      `Dear Test User,\n\nPlease verify your email address by clicking the link below:\nhttps://client.example/account/verify-email#token=token%2B%2F%3D\n\nBest regards,\nMulti-Vendor Delivery Platform`,
    );
  });

  it('fails clearly without a configured callback base URL', async () => {
    const service = build();

    await expect(
      service.sendAccountVerificationEmail(user as never, token),
    ).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
      response: {
        error: 'ACCOUNT_ACTION_BASE_URL is required to send account emails',
      },
    });
    expect(sendMail).not.toHaveBeenCalled();
  });
});
