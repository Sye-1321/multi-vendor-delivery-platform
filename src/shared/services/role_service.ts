import { Injectable } from '@nestjs/common';
import { IRoleService } from '../interfaces/role_service.interface';
import { Role, RoleOrder } from 'src/application/constants/constants';

@Injectable()
export class RoleService implements IRoleService {
  sortRoles(roles: Role[]): Role[] {
    const validRoles = roles.filter((role) => role in RoleOrder);
    if (validRoles?.length) {
      validRoles.sort((a, b) => RoleOrder[a] - RoleOrder[b]);
    }
    return validRoles;
  }
}
