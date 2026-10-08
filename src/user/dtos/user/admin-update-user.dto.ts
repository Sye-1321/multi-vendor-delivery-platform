import { IsEnum, IsOptional } from 'class-validator';
import { Role } from 'src/application/constants/constants';
import { UserStatus } from 'src/user/constants/constants';

export class AdminUpdateUserDTO {
  @IsOptional()
  @IsEnum(Role)
  readonly role?: Role;

  @IsOptional()
  @IsEnum(UserStatus)
  readonly status?: UserStatus;
}
