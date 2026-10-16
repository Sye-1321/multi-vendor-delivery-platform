import { IsEnum, IsOptional } from 'class-validator';
import { Role } from 'src/application/constants/constants';
import { UserStatus } from 'src/user/constants/constants';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminUpdateUserDTO {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  readonly role?: Role;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  readonly status?: UserStatus;
}
