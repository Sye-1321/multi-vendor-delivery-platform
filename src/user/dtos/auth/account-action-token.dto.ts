import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AccountActionTokenDTO {
  @ApiProperty({ description: 'Single-use account action token' })
  @IsString()
  @IsNotEmpty()
  readonly token: string;
}
