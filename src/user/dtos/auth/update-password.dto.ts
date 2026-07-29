import { IsString, Matches, MinLength } from 'class-validator';
import { ResetPasswordDTO } from './reset-password.dto';
import { passwordStrengthRegEx } from 'src/user/constants/constants';

export class UpdatePasswordDTO extends ResetPasswordDTO {
  @IsString()
  @MinLength(8, {
    message: 'Current password must be at least 8 characters long.',
  })
  @Matches(passwordStrengthRegEx, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).',
  })
  readonly currentPassword: string;
}
