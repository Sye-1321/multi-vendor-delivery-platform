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
import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';

export class SavedAddressDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subCity: string;
}

export class RestaurantAdminDTO {
  @ApiProperty({ minLength: 3 })
  @IsString()
  @MinLength(3, { message: 'Name must be at least 3 characters long.' })
  readonly name: string;

  @ApiProperty({ format: 'email' })
  @IsEmail()
  readonly email: string;

  @ApiProperty({ pattern: '^251\\d{9}$' })
  @IsString()
  @Matches(/^251\d{9}$/, {
    message: 'Phone number must start with 251 followed by 9 digits',
  })
  readonly phoneNumber: string;

  @ApiProperty({ type: () => SavedAddressDTO })
  @IsDefined()
  @ValidateNested()
  @Type(() => SavedAddressDTO)
  savedAddress: SavedAddressDTO;
}

export class CreateRestaurantDTO {
  @ApiProperty({ minLength: 3 })
  @IsString()
  @MinLength(3, { message: 'Name must be at least 3 characters long.' })
  readonly name: string;

  @ApiProperty({ type: () => SavedAddressDTO })
  @IsDefined()
  @ValidateNested()
  @Type(() => SavedAddressDTO)
  savedAddress: SavedAddressDTO;

  @ApiProperty({ pattern: '^251\\d{9}$' })
  @IsString()
  @Matches(/^251\d{9}$/, {
    message: 'Phone number must start with 251 followed by 9 digits',
  })
  readonly phoneNumber: string;

  @ApiProperty({ example: '08:00' })
  @IsString()
  readonly openingHours: string;

  @ApiProperty({ example: '22:00' })
  @IsString()
  readonly closingHours: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly description?: string;

  @ApiProperty()
  @IsBoolean()
  readonly deliveryPersonAvailability: boolean;

  @ApiProperty({ type: () => RestaurantAdminDTO })
  @IsDefined()
  @ValidateNested()
  @Type(() => RestaurantAdminDTO)
  restaurantAdminData: RestaurantAdminDTO;
}

export class UpdateRestaurantDTO extends PartialType(
  OmitType(CreateRestaurantDTO, ['restaurantAdminData'] as const),
) {}
