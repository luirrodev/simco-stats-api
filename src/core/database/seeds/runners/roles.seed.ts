import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { Role } from '@core/access-control/roles/entities/role.entity';
import { Permission } from '@core/access-control/permissions/entities/permission.entity';

const SUPER_ADMIN_ROLE_NAME = 'SUPER_ADMIN';
const logger = new Logger('RolesSeed');

export async function seedSuperAdminRole(
  dataSource: DataSource,
  allPermissions: Permission[],
): Promise<Role> {
  const roleRepo = dataSource.getRepository(Role);

  let role = await roleRepo.findOne({
    where: { name: SUPER_ADMIN_ROLE_NAME },
    relations: ['permissions'],
  });

  if (!role) {
    role = roleRepo.create({
      name: SUPER_ADMIN_ROLE_NAME,
      description: 'Acceso total al sistema',
      permissions: allPermissions,
    });
    role = await roleRepo.save(role);
    logger.log(
      `Rol ${SUPER_ADMIN_ROLE_NAME} creado con ${allPermissions.length} permisos`,
    );
    return role;
  }

  const currentIds = new Set(role.permissions.map((p) => p.id));
  const targetIds = allPermissions.map((p) => p.id);
  const changed =
    currentIds.size !== targetIds.length ||
    targetIds.some((id) => !currentIds.has(id));

  if (changed) {
    role.permissions = allPermissions;
    role.version += 1;
    role = await roleRepo.save(role);
    logger.log(
      `Rol ${SUPER_ADMIN_ROLE_NAME} actualizado (version ${role.version}) con ${allPermissions.length} permisos`,
    );
  } else {
    logger.log(`Rol ${SUPER_ADMIN_ROLE_NAME} ya está al día`);
  }

  return role;
}
