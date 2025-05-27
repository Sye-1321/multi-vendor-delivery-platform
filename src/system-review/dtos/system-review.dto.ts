import { IsInt, Min, Max, IsString, MinLength, IsOptional } from 'class-validator';

export class CreateReviewDTO {
  @IsString()
  @MinLength(150, { message: 'Review text must be at least 50 characters long.' })
  reviewText: string;

  @IsInt()
  @Min(1, { message: 'Rating must be at least 1.' })
  @Max(5, { message: 'Rating cannot be more than 5.' })
  rating: number;
}


export class UpdateReviewDTO {
  @IsOptional()
  @IsString()
  @MinLength(150, { message: 'Review text must be at least 150 characters long.' })
  reviewText?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Rating must be at least 1.' })
  @Max(5, { message: 'Rating cannot be more than 5.' })
  rating?: number;
}
