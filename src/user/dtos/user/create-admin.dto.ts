import { OmitType } from '@nestjs/mapped-types';
import { CreateUserDTO } from './create-user.dto';

export class CreateAdminDTO extends OmitType(CreateUserDTO, ['password'] as const) {}
