import { IsNotEmpty, IsString } from 'class-validator';

export class UserSavedAddressDTO {
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  subCity: string;
}
