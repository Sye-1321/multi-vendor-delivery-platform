import {
  IsString,
  IsEmail,
  MinLength,
  Matches,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserSavedAddressDTO } from './user-saved-address.dto';

const passwordStrengthRegEx =
  /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

export class CreateUserDTO {
  @IsString()
  @MinLength(3, { message: 'Name must be at least 3 characters long.' })
  readonly name: string;

  @IsEmail()
  readonly email: string;

  @IsString()
  @Matches(/^251\d{9}$/, {
    message: 'Phone number must be in the format 251 followed by 9 digits.',
  })
  readonly phoneNumber: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @Matches(passwordStrengthRegEx, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).',
  })
  readonly password: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserSavedAddressDTO)
  readonly savedAddress?: UserSavedAddressDTO;
}
