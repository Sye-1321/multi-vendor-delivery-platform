import { IsNotEmpty, IsString } from 'class-validator';
import { ResetPasswordDTO } from './reset-password.dto';

export class AccountActionPasswordDTO extends ResetPasswordDTO {
  @IsString()
  @IsNotEmpty()
  readonly token: string;
}
