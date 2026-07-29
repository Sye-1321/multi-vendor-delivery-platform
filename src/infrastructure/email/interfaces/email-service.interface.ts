import { Result } from 'src/domain/result/result';
import { User } from 'src/user/user';

export interface IEmailService {
  sendAccountVerificationEmail(user: User): Promise<Result<void>>;
  sendRegistrationCompletionEmail(user: User): Promise<Result<void>>;
  sendPasswordResetInstructionsEmail(user: User): Promise<Result<void>>;
  sendEmailChangeConfirmationEmail(
    user: any,
    newEmail: string,
  ): Promise<Result<void>>;
}
