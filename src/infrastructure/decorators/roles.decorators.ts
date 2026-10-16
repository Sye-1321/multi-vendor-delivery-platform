import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiExtension } from '@nestjs/swagger';
import { Role, ROLE_KEY } from 'src/application/constants/constants';

export const Roles = (...roles: Role[]) =>
  applyDecorators(
    SetMetadata(ROLE_KEY, roles),
    ApiExtension('x-required-roles', roles),
  );
