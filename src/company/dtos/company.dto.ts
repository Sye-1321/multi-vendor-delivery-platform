import {
  IsString,
  IsNotEmpty,
  ValidateNested,
  Matches,
  IsOptional,
  MinLength,
  IsEmail,
  IsDefined,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

export class CompanyAdminDTO {
  @ApiProperty({ minLength: 3 })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({ format: 'email' })
  @IsEmail()
  email: string;

  @ApiProperty({ pattern: '^251\\d{9}$' })
  @IsString()
  @Matches(/^251\d{9}$/, {
    message: 'Phone number must be in the format 251 followed by 9 digits.',
  })
  readonly phoneNumber: string;

  @ApiProperty({ type: () => SavedAddressDTO })
  @IsDefined()
  @ValidateNested()
  @Type(() => SavedAddressDTO)
  savedAddress: SavedAddressDTO;
}

// CreateCompany DTO
export class CreateCompanyDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ pattern: '^251\\d{9}$' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^251\d{9}$/, {
    message: 'Phone number must start with 251 followed by 9 digits',
  })
  phoneNumber: string;

  @ApiProperty({ type: () => SavedAddressDTO })
  @IsDefined()
  @ValidateNested()
  @Type(() => SavedAddressDTO)
  savedAddress: SavedAddressDTO;

  @ApiProperty({ type: () => CompanyAdminDTO })
  @IsDefined()
  @ValidateNested()
  @Type(() => CompanyAdminDTO)
  companyAdminData: CompanyAdminDTO;
}

// UpdateCompany DTO
export class UpdateCompanyDTO {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ pattern: '^251\\d{9}$' })
  @IsOptional()
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
