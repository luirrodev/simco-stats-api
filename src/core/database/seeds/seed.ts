import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import './load-env';

import dataSource from '../data-source';
import { seedPermissions } from './runners/permissions.seed';
import { seedSuperAdminRole } from './runners/roles.seed';
import { seedSuperAdminUser } from './runners/staff-user.seed';

const logger = new Logger('DatabaseSeed');

async function bootstrap(): Promise<void> {
  await dataSource.initialize();
  logger.log('Conexión a la base de datos inicializada');

  try {
    const allPermissions = await seedPermissions(dataSource);
    logger.log(`Permisos sincronizados: ${allPermissions.length}`);

    const superAdminRole = await seedSuperAdminRole(dataSource, allPermissions);

    await seedSuperAdminUser(dataSource, superAdminRole);

    logger.log('Seed completado exitosamente');
  } finally {
    await dataSource.destroy();
  }
}

bootstrap().catch((error: unknown) => {
  logger.error('Error ejecutando el seed', error);
  process.exitCode = 1;
});
