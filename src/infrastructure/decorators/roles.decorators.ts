import { SetMetadata } from '@nestjs/common';
import { Role, ROLE_KEY } from 'src/application/constants/constants';

export const Roles = (...role: Role[]) => SetMetadata(ROLE_KEY, role);
