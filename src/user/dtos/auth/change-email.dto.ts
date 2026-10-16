import { IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeEmailDTO {
  @ApiProperty({ format: 'email' })
  @IsEmail()
  readonly newEmail: string;

  @ApiProperty({ format: 'password', minLength: 8, writeOnly: true })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  readonly currentPassword: string;
}
