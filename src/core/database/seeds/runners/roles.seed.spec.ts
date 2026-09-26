import type { DataSource } from 'typeorm';

import { seedSuperAdminRole } from './roles.seed';

describe('seedSuperAdminRole', () => {
  it('does not update an already synchronized role', async () => {
    const role = {
      id: 1,
      version: 1,
      permissions: [{ id: 1 }, { id: 2 }],
    };
    const repository = {
      findOne: jest.fn().mockResolvedValue(role),
      save: jest.fn(),
    };
    const dataSource = {
      getRepository: jest.fn().mockReturnValue(repository),
    } as unknown as DataSource;

    await expect(
      seedSuperAdminRole(dataSource, [{ id: 1 }, { id: 2 }]),
    ).resolves.toBe(role);

    expect(repository.save).not.toHaveBeenCalled();
  });
});
