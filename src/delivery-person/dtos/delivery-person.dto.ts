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
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

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

export class CreateDeliveryPersonDTO {
  @ApiProperty({ minLength: 3 })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({ pattern: '^251\\d{9}$' })
  @Transform(({ value }) => String(value))
  @IsString()
  @Matches(/^251\d{9}$/, {
    message: 'Phone number must start with 251 followed by 9 digits',
  })
  phoneNumber: string;

  @ApiProperty({ type: () => SavedAddressDTO })
  @IsDefined()
  @ValidateNested()
  @Type(() => SavedAddressDTO)
  savedAddress: SavedAddressDTO;
}

export class CreateDeliveryPersonWithProfileImageDTO extends CreateDeliveryPersonDTO {
  @ApiProperty()
  @IsString()
  profileImage: string;
}

export class UpdateDeliveryPersonDTO extends PartialType(
  CreateDeliveryPersonDTO,
) {
  @ApiPropertyOptional({ minLength: 3 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @Transform(({ value }) => (value === '' ? undefined : value))
  name?: string;

  @ApiPropertyOptional({ pattern: '^251\\d{9}$' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : String(value)))
  @IsString()
  @Matches(/^251\d{9}$/, {
    message: 'Phone number must start with 251 followed by 9 digits',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({ type: () => SavedAddressDTO })
  @IsOptional()
  @ValidateNested()
  @Type(() => SavedAddressDTO)
  savedAddress?: SavedAddressDTO;
}
