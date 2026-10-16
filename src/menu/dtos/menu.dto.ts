import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Types } from 'mongoose';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMenuDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    type: [String],
    maxItems: 100,
    uniqueItems: true,
    items: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsMongoId({ each: true })
  @Type(() => String)
  menuItemsIds?: Types.ObjectId[];
}

export class UpdateMenuDTO {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    type: [String],
    maxItems: 100,
    uniqueItems: true,
    items: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsMongoId({ each: true })
  @Type(() => String)
  menuItemsIds?: Types.ObjectId[];
}
