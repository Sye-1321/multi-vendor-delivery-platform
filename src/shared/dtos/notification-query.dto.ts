import { Type } from 'class-transformer';
import { IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationQueryDTO {
  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 50, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @ApiPropertyOptional({
    description:
      'Return notifications created before this MongoDB ObjectId cursor.',
    pattern: '^[0-9a-fA-F]{24}$',
  })
  @IsOptional()
  @IsMongoId()
  before?: string;
}
