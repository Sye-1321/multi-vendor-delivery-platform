import { OmitType } from '@nestjs/swagger';
import { CreateUserDTO } from './create-user.dto';

export class CreateAdminDTO extends OmitType(CreateUserDTO, [
  'password',
] as const) {}
