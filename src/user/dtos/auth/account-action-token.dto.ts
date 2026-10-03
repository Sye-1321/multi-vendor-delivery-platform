import { IsNotEmpty, IsString } from 'class-validator';

export class AccountActionTokenDTO {
  @IsString()
  @IsNotEmpty()
  readonly token: string;
}
