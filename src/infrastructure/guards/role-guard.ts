import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Role, ROLE_KEY } from 'src/application/constants/constants';
import { TYPES } from 'src/application/constants/types';
import { IAccessControlService } from 'src/shared/interfaces/access_control_service.interface';
import { IContextService } from '../context/context-service.interface';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TYPES.IAccessControlService)
    private readonly accessControlService: IAccessControlService,
    @Inject(TYPES.IContextService)
    private readonly contextService: IContextService,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const currentRole = this.contextService.getContext().role;

    if (!currentRole) {
      return false;
    }

    return requiredRoles.some((requiredRole) =>
      this.accessControlService.isAuthorized({
        currentRole,
        requiredRole,
      }),
    );
  }
}
