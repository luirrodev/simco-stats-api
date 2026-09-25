import 'reflect-metadata';
import './load-env';

import dataSource from '../data-source';
import { seedPermissions } from './runners/permissions.seed';
import { seedSuperAdminRole } from './runners/roles.seed';
import { seedSuperAdminUser } from './runners/staff-user.seed';

async function bootstrap(): Promise<void> {
  await dataSource.initialize();
  console.log('Conexión a la base de datos inicializada');

  try {
    const allPermissions = await seedPermissions(dataSource);
    console.log(`Permisos sincronizados: ${allPermissions.length}`);

    const superAdminRole = await seedSuperAdminRole(dataSource, allPermissions);

    await seedSuperAdminUser(dataSource, superAdminRole);

    console.log('Seed completado exitosamente');
  } finally {
    await dataSource.destroy();
  }
}

bootstrap().catch((error) => {
  console.error('Error ejecutando el seed:', error);
  process.exitCode = 1;
});
