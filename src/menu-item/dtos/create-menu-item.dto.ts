import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreateMenuItemDTO {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsBoolean()
  availability: boolean;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateMenuItemDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  availability?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}
