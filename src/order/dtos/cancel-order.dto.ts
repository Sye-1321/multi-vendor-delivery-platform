import { IsString, MaxLength, MinLength } from 'class-validator';

export class CancelOrderDTO {
  @IsString()
  @MinLength(3)
  @MaxLength(250)
  reason: string;
}
