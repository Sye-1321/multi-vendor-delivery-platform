import {
  IsString,
  IsNotEmpty,
  ValidateNested,
  Matches,
  IsOptional,
  MinLength,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SavedAddressDTO {
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  subCity: string;
}

export class CompanyAdminDTO {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^251\d{9}$/, {
    message: 'Phone number must be in the format 251 followed by 9 digits.',
  })
  readonly phoneNumber: string;

  @ValidateNested()
  @Type(() => SavedAddressDTO)
  savedAddress: SavedAddressDTO;
}

// CreateCompany DTO
export class CreateCompanyDTO {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^251\d{9}$/, {
    message: 'Phone number must start with 251 followed by 9 digits',
  })
  phoneNumber: string;

  @ValidateNested()
  @Type(() => SavedAddressDTO)
  savedAddress: SavedAddressDTO;

  @ValidateNested()
  @Type(() => CompanyAdminDTO)
  companyAdminData: CompanyAdminDTO;
}

// UpdateCompany DTO
export class UpdateCompanyDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
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
