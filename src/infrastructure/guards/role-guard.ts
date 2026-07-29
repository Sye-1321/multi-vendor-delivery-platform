import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { IAccessControlService } from 'src/shared/interfaces/access_control_service.interface';
import { Context } from '../context/context';
import { TYPES } from 'src/application/constants/types';
import { IContextService } from '../context/context-service.interface';
import { Role, ROLE_KEY } from 'src/application/constants/constants';

@Injectable()
export class RoleGuard implements CanActivate {
  private context: Context;

  constructor(
    private readonly reflector: Reflector,
    @Inject(TYPES.IAccessControlService)
    private readonly accessControlService: IAccessControlService,
    @Inject(TYPES.IContextService)
    private readonly contextService: IContextService,
  ) {
    this.context = this.contextService.getContext();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Log the required roles for the current route handler
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    console.log('🔥 Required Roles:', requiredRoles);

    // If no roles are required, just log and allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      console.log('✅ No roles required, allowing access.');
      return true;
    }

    // Log the current role from the context (which should be injected from the auth system)
    console.log('🔑 Current User Role:', this.context.role);

    for (const role of requiredRoles) {
      // Log each role being checked
      console.log(
        `⚡ Checking if current role ${this.context.role} is authorized for required role ${role}`,
      );

      // Check if the current role has the required role
      const isAuthorized = this.accessControlService.isAuthorized({
        currentRole: this.context.role as Role,
        requiredRole: role as Role,
      });

      console.log(`⚡ Is Authorized for Role ${role}? ${isAuthorized}`);

      if (isAuthorized) {
        console.log('✅ Authorization Passed for Role:', role);
        return true;
      }
    }

    console.log('⛔ Authorization Failed');
    return false;
  }
}
