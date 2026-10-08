import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
  IsDefined,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

export class SavedAddressDTO {
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  subCity: string;
}

export class CreateDeliveryPersonDTO {
  @IsString()
  @MinLength(3)
  name: string;

  @Transform(({ value }) => String(value))
  @IsString()
  @Matches(/^251\d{9}$/, {
    message: 'Phone number must start with 251 followed by 9 digits',
  })
  phoneNumber: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => SavedAddressDTO)
  savedAddress: SavedAddressDTO;
}

export class CreateDeliveryPersonWithProfileImageDTO extends CreateDeliveryPersonDTO {
  @IsString()
  profileImage: string;
}

export class UpdateDeliveryPersonDTO extends PartialType(
  CreateDeliveryPersonDTO,
) {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @Transform(({ value }) => (value === '' ? undefined : value))
  name?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : String(value)))
  @IsString()
  @Matches(/^251\d{9}$/, {
    message: 'Phone number must start with 251 followed by 9 digits',
  })
  phoneNumber?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SavedAddressDTO)
  savedAddress?: SavedAddressDTO;
}
