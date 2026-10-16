import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmailDTO {
  @ApiProperty({ format: 'email' })
  @IsEmail()
  readonly email: string;
}
