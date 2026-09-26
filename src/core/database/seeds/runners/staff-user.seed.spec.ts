import type { DataSource, EntityManager } from 'typeorm';

import { Role } from '@core/access-control/roles/entities/role.entity';
import { User } from '@core/access-control/users/entities/user.entity';
import { seedSuperAdminUser } from './staff-user.seed';

describe('seedSuperAdminUser', () => {
  const environmentKeys = [
    'NODE_ENV',
    'SEED_SUPERADMIN_EMAIL',
    'SEED_SUPERADMIN_PASSWORD',
    'SEED_SUPERADMIN_FIRST_NAME',
    'SEED_SUPERADMIN_LAST_NAME',
  ] as const;
  const originalEnvironment = new Map(
    environmentKeys.map((key) => [key, process.env[key]]),
  );

  afterEach(() => {
    for (const key of environmentKeys) {
      const value = originalEnvironment.get(key);
      if (value === undefined) Reflect.deleteProperty(process.env, key);
      else process.env[key] = value;
    }
  });

  const createDataSource = (existingUser: User | null) => {
    const userRepository = {
      findOne: jest.fn().mockResolvedValue(existingUser),
    };
    const manager = {
      create: jest.fn((_entity: unknown, values: unknown) => values),
      save: jest.fn().mockResolvedValue({ id: 1 }),
    } as unknown as EntityManager;
    const dataSource = {
      getRepository: jest.fn().mockReturnValue(userRepository),
      transaction: jest.fn(
        (work: (transactionalManager: EntityManager) => Promise<unknown>) =>
          work(manager),
      ),
    } as unknown as DataSource;

    return { dataSource, userRepository, manager };
  };

  it('uses development defaults when seed credentials are unset', async () => {
    process.env.NODE_ENV = 'dev';
    delete process.env.SEED_SUPERADMIN_EMAIL;
    delete process.env.SEED_SUPERADMIN_PASSWORD;
    delete process.env.SEED_SUPERADMIN_FIRST_NAME;
    delete process.env.SEED_SUPERADMIN_LAST_NAME;
    const { dataSource, userRepository } = createDataSource(null);

    await seedSuperAdminUser(dataSource, { id: 1 } as Role);

    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { email: 'admin@qvawin.com' },
      withDeleted: true,
    });
  });

  it('does not create a duplicate super administrator', async () => {
    process.env.NODE_ENV = 'dev';
    const { dataSource } = createDataSource({ id: 1 } as User);

    await seedSuperAdminUser(dataSource, { id: 1 } as Role);

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('requires explicit credentials outside development', async () => {
    process.env.NODE_ENV = 'prod';
    delete process.env.SEED_SUPERADMIN_EMAIL;

    const { dataSource } = createDataSource(null);

    await expect(seedSuperAdminUser(dataSource, { id: 1 } as Role)).rejects.toThrow(
      'Faltan variables de entorno',
    );
  });
});
