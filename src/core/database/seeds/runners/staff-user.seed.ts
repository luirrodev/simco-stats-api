import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { envOrDefault } from '@core/common/utils/environment.util';

import {
  User,
  UserType,
} from '@core/access-control/users/entities/user.entity';
import { Staff } from '@core/access-control/staff/entities/staff.entity';
import { Role } from '@core/access-control/roles/entities/role.entity';

const DEV_DEFAULTS = {
  email: 'admin@qvawin.com',
  password: 'ChangeMe123!',
  firstName: 'Super',
  lastName: 'Admin',
};
const logger = new Logger('StaffUserSeed');

export async function seedSuperAdminUser(
  dataSource: DataSource,
  superAdminRole: Role,
): Promise<void> {
  const isDev = envOrDefault(process.env.NODE_ENV, 'dev') === 'dev';

  const email = envOrDefault(
    process.env.SEED_SUPERADMIN_EMAIL,
    isDev ? DEV_DEFAULTS.email : undefined,
  );
  const password = envOrDefault(
    process.env.SEED_SUPERADMIN_PASSWORD,
    isDev ? DEV_DEFAULTS.password : undefined,
  );
  const firstName = envOrDefault(
    process.env.SEED_SUPERADMIN_FIRST_NAME,
    isDev ? DEV_DEFAULTS.firstName : undefined,
  );
  const lastName = envOrDefault(
    process.env.SEED_SUPERADMIN_LAST_NAME,
    isDev ? DEV_DEFAULTS.lastName : undefined,
  );

  if (!email || !password || !firstName || !lastName) {
    throw new Error(
      'Faltan variables de entorno SEED_SUPERADMIN_EMAIL / SEED_SUPERADMIN_PASSWORD / ' +
        'SEED_SUPERADMIN_FIRST_NAME / SEED_SUPERADMIN_LAST_NAME para crear el usuario SUPER_ADMIN inicial',
    );
  }

  const userRepo = dataSource.getRepository(User);
  const existingUser = await userRepo.findOne({
    where: { email },
    withDeleted: true,
  });

  if (existingUser) {
    logger.log(`Usuario SUPER_ADMIN ya existe (${email}), no se modifica`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await dataSource.transaction(async (manager) => {
    const newUser = manager.create(User, {
      email,
      firstName,
      lastName,
      password: passwordHash,
      authProvider: 'local',
      userType: UserType.STAFF,
      isActive: true,
      role: superAdminRole,
      roleId: superAdminRole.id,
    });
    const savedUser = await manager.save(newUser);

    const newStaff = manager.create(Staff, {
      userId: savedUser.id,
      employeeCode: null,
      department: null,
    });
    await manager.save(newStaff);
  });

  logger.log(`Usuario SUPER_ADMIN creado (${email})`);
}
