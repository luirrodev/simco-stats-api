import { DataSource } from 'typeorm';

import { Permission } from '@core/access-control/permissions/entities/permission.entity';
import { PERMISSIONS_SEED } from '@core/access-control/permissions/constants/permissions.constant';

export async function seedPermissions(
  dataSource: DataSource,
): Promise<Permission[]> {
  const permissionRepo = dataSource.getRepository(Permission);

  await permissionRepo.upsert(PERMISSIONS_SEED, {
    conflictPaths: ['name'],
    skipUpdateIfNoValuesChanged: true,
  });

  return permissionRepo.find();
}
