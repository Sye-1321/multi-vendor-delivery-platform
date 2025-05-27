import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';
import { Types } from 'mongoose';
import { Type } from 'class-transformer';

export class CreateMenuDTO {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsArray()
  @Type(() => String)
  menuItemsIds?: Types.ObjectId[];
}

export class UpdateMenuDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @Type(() => String)
  menuItemsIds?: Types.ObjectId[];
}
