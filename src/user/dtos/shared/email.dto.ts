import { IsEmail } from 'class-validator';

export class EmailDTO {
  @IsEmail()
  readonly email: string;
}
