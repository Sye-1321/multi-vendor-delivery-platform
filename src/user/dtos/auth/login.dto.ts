import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDTO {
  @ApiProperty({ format: 'email' })
  @IsEmail()
  readonly email: string;

  @ApiProperty({ format: 'password', minLength: 8, writeOnly: true })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  readonly password: string;
}
