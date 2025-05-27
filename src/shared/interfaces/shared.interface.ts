import { Role } from "src/application/constants/constants";


export interface IIsAuthorizedProps {
  currentRole: Role;
  requiredRole: Role;
}
