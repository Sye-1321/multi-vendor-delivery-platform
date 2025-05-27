import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateMenuItemDTO {
  @IsString()
  name: string;

  @IsNumber()
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
  price?: number;

  @IsOptional()
  @IsBoolean()
  availability?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}
