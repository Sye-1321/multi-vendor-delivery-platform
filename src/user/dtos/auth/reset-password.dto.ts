import { IsString, MinLength, Matches, Validate } from 'class-validator';
import { passwordStrengthRegEx } from 'src/user/constants/constants';
import { PasswordsMatchConstraint } from '../shared/match.decorator';

export class ResetPasswordDTO {
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @Matches(passwordStrengthRegEx, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).',
  })
  readonly newPassword: string;

  @IsString()
  @Validate(PasswordsMatchConstraint)
  readonly confirmPassword: string;
}
