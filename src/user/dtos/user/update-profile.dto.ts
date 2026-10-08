import {
  IsOptional,
  IsString,
  MinLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserSavedAddressDTO } from './user-saved-address.dto';

export class UpdateUserProfileDTO {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Name must be at least 3 characters long.' })
  readonly name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^251\d{9}$/, {
    message: 'Phone number must be in the format 251 followed by 9 digits.',
  })
  readonly phoneNumber?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserSavedAddressDTO)
  readonly savedAddress?: UserSavedAddressDTO;
}
