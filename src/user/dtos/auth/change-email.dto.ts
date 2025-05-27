import { IsEmail, MinLength } from 'class-validator';

export class ChangeEmailDTO {
  @IsEmail()
  readonly newEmail: string;

  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  readonly currentPassword: string;
}
