import {
  IsString,
  IsBoolean,
  ValidateNested,
  MinLength,
  IsEmail,
  Matches,
  IsNotEmpty,
  IsDefined,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OmitType, PartialType } from '@nestjs/mapped-types';

export class SavedAddressDTO {
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  subCity: string;
}

export class RestaurantAdminDTO {
  @IsString()
  @MinLength(3, { message: 'Name must be at least 3 characters long.' })
  readonly name: string;

  @IsEmail()
  readonly email: string;

  @IsString()
  @Matches(/^251\d{9}$/, {
    message: 'Phone number must start with 251 followed by 9 digits',
  })
  readonly phoneNumber: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => SavedAddressDTO)
  savedAddress: SavedAddressDTO;
}

export class CreateRestaurantDTO {
  @IsString()
  @MinLength(3, { message: 'Name must be at least 3 characters long.' })
  readonly name: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => SavedAddressDTO)
  savedAddress: SavedAddressDTO;

  @IsString()
  @Matches(/^251\d{9}$/, {
    message: 'Phone number must start with 251 followed by 9 digits',
  })
  readonly phoneNumber: string;

  @IsString()
  readonly openingHours: string;

  @IsString()
  readonly closingHours: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsBoolean()
  readonly deliveryPersonAvailability: boolean;

  @IsDefined()
  @ValidateNested()
  @Type(() => RestaurantAdminDTO)
  restaurantAdminData: RestaurantAdminDTO;
}

export class UpdateRestaurantDTO extends PartialType(
  OmitType(CreateRestaurantDTO, ['restaurantAdminData'] as const),
) {}
