import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../../../common/decorators/permissions.decorator';
import { PayloadToken } from '@common/types/jwt.payload';
import { RolesService } from '../../roles/services/roles.service';
import { Request } from 'express';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[] | undefined>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user?.roleId) {
      throw new UnauthorizedException('Usted no tiene acceso a este recurso');
    }

    const roleId = user.roleId;

    const role = await this.rolesService.getRoleById(roleId);

    this.validateRoleVersion(user, role.version);

    const hasPermission = requiredPermissions.some((p) =>
      role.permissions.some((permission) => permission.name === p),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Acceso denegado: No tiene los permisos requeridos para acceder a este recurso`,
      );
    }

    return true;
  }

  private validateRoleVersion(
    user: PayloadToken,
    currentVersion: number,
  ): void {
    const roleVersion: unknown = Reflect.get(user, 'roleVersion');

    if (roleVersion === undefined) {
      return;
    }

    if (currentVersion !== roleVersion) {
      throw new UnauthorizedException(
        `Tus permisos han sido actualizados. Por favor, inicia sesión nuevamente`,
      );
    }
  }
}
