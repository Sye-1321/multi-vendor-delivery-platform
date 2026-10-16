import { IsNotEmpty, IsString } from 'class-validator';
import { ResetPasswordDTO } from './reset-password.dto';
import { ApiProperty } from '@nestjs/swagger';

export class AccountActionPasswordDTO extends ResetPasswordDTO {
  @ApiProperty({ description: 'Single-use account action token' })
  @IsString()
  @IsNotEmpty()
  readonly token: string;
}
