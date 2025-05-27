import { IsOptional, IsString, MinLength, Matches } from 'class-validator';

export class UpdateUserProfileDTO {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Name must be at least 3 characters long.' })
  readonly name?: string;

  @IsOptional()
  @Matches(/^\+251\d{9}$/, {
    message: 'Phone number must be in the format +251 followed by 9 digits.',
  })
  readonly phoneNumber?: string;

  @IsOptional()
  readonly savedAddress?: {
    city: string;
    subCity: string;
  };
}
