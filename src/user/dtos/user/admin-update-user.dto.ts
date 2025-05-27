import { IsOptional} from 'class-validator';
import { Role } from 'src/application/constants/constants';
import { UserStatus } from 'src/user/constants/constants';

export class AdminUpdateUserDTO {
  @IsOptional()
  readonly roles?: Role;

  @IsOptional()
  readonly status?: UserStatus;
}
