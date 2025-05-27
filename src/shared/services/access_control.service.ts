import { Inject, Injectable } from '@nestjs/common';
import { IAccessControlService } from '../interfaces/access_control_service.interface';
import { IRoleService } from '../interfaces/role_service.interface';
import { IIsAuthorizedProps } from '../interfaces/shared.interface';
import { TYPES } from 'src/application/constants/types';
import { Role, RoleOrder } from 'src/application/constants/constants';

@Injectable()
export class AccessControlService implements IAccessControlService {
  private hierarchies: Map<string, number>; 

  constructor(@Inject(TYPES.IRoleService) private readonly roleService: IRoleService) {
    this.hierarchies = this.mapRoleToPriority();
  }

  private mapRoleToPriority(): Map<string, number> {
    const sortedRoles = this.roleService.sortRoles(Object.values(Role));

    if (sortedRoles?.length) {
      const rolesPriorityMap = sortedRoles.reduce((map, role) => {
        map.set(role, RoleOrder[role]); 
        return map;
      }, new Map<string, number>());
      
      return rolesPriorityMap;
    }
    throw new Error("Role sorting failed or roles not found.");
  }

  public isAuthorized({ currentRole, requiredRole }: IIsAuthorizedProps): boolean {
    const currentRolePriority = this.hierarchies.get(currentRole.trim());
    const requiredRolePriority = this.hierarchies.get(requiredRole);
    if (currentRolePriority !== undefined && requiredRolePriority !== undefined) {
      return currentRolePriority==requiredRolePriority
    }

    return false; 
  }
}

