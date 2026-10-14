import { Role } from 'src/application/constants/constants';

export interface IIsAuthorizedProps {
  currentRole: Role;
  requiredRole: Role;
}

export interface PaginationOptions {
  limit: number;
  offset: number;
}
