import {
  IsInt,
  Min,
  Max,
  IsString,
  MinLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDTO {
  @ApiProperty({ minLength: 150 })
  @IsString()
  @MinLength(150, {
    message: 'Review text must be at least 150 characters long.',
  })
  reviewText: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1, { message: 'Rating must be at least 1.' })
  @Max(5, { message: 'Rating cannot be more than 5.' })
  rating: number;
}

export class UpdateReviewDTO {
  @ApiPropertyOptional({ minLength: 150 })
  @IsOptional()
  @IsString()
  @MinLength(150, {
    message: 'Review text must be at least 150 characters long.',
  })
  reviewText?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Rating must be at least 1.' })
  @Max(5, { message: 'Rating cannot be more than 5.' })
  rating?: number;
}
