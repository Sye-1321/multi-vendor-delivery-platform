import { Result } from 'src/domain/result/result';
import { User } from 'src/user/user';

export interface IEmailService {
  sendAccountVerificationEmail(
    user: User,
    token: string,
  ): Promise<Result<void>>;
  sendRegistrationCompletionEmail(
    user: Pick<User, 'name' | 'email'>,
    token: string,
  ): Promise<Result<void>>;
  sendPasswordResetInstructionsEmail(
    user: User,
    token: string,
  ): Promise<Result<void>>;
  sendEmailChangeConfirmationEmail(
    user: User,
    newEmail: string,
    token: string,
  ): Promise<Result<void>>;
}
