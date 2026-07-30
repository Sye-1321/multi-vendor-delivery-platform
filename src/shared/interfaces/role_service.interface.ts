import { Role } from 'src/application/constants/constants';

export interface IRoleService {
  sortRoles(roles: Role[]): Role[];
}
