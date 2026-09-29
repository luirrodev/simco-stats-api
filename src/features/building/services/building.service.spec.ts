import { BadGatewayException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import { SimCompaniesClient } from '@features/auth/services/simcompanies-client.service';
import { BuildingEntity } from '../entities/building.entity';
import { BuildingService } from './building.service';

describe('BuildingService', () => {
  const transactionRepository = {
    find: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const transactionManager = {
    getRepository: (_entity: typeof BuildingEntity) => transactionRepository,
  };
  const transaction = jest.fn(
    (callback: (manager: typeof transactionManager) => Promise<unknown>) =>
      callback(transactionManager),
  );
  const repository = {
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOneBy: jest.fn(),
    manager: {
      transaction,
    },
  } as unknown as jest.Mocked<Repository<BuildingEntity>>;
  const client = {
    get: jest.fn(),
  } as unknown as jest.Mocked<SimCompaniesClient>;
  const service = new BuildingService(repository, client);

  beforeEach(() => jest.clearAllMocks());

  it('synchronizes only restaurants and removes buildings absent from the map', async () => {
    client.get.mockResolvedValue([
      {
        id: 1,
        name: 'Restaurant',
        size: 2,
        kind: 'r',
        category: 'sales',
        cost: 10,
      },
      { id: 2, name: 'Office', size: 1, kind: 'B' },
    ]);
    transactionRepository.find.mockResolvedValue([{ id: 3 }]);

    await expect(service.syncBuildingsFromApi()).resolves.toEqual({
      success: true,
      created: 1,
      updated: 0,
      deleted: 1,
      total: 1,
    });
    expect(client.get).toHaveBeenCalledWith(
      'https://www.simcompanies.com/api/v2/companies/me/buildings/',
      {
        headers: {
          'x-prot': '0c346342739775fe4ea61331265ccf16',
          'x-ts': '1790459939388',
        },
      },
    );
    expect(transactionRepository.insert).toHaveBeenCalledWith({
      id: 1,
      name: 'Restaurant',
      size: 2,
      kind: 'r',
      category: 'sales',
      cost: 10,
    });
    expect(transactionRepository.delete).toHaveBeenCalledWith([3]);
  });

  it('updates an existing restaurant without creating a duplicate', async () => {
    client.get.mockResolvedValue([
      { id: 1, name: 'Restaurant', size: 2, kind: 'r' },
    ]);
    transactionRepository.find.mockResolvedValue([{ id: 1 }]);

    await expect(service.syncBuildingsFromApi()).resolves.toMatchObject({
      created: 0,
      updated: 1,
      deleted: 0,
      total: 1,
    });
    expect(transactionRepository.update).toHaveBeenCalledWith(1, {
      id: 1,
      name: 'Restaurant',
      size: 2,
      kind: 'r',
      category: null,
      cost: null,
    });
    expect(transactionRepository.insert).not.toHaveBeenCalled();
  });

  it('removes every saved restaurant when the map contains no restaurants', async () => {
    client.get.mockResolvedValue([
      { id: 2, name: 'Office', size: 1, kind: 'B' },
    ]);
    transactionRepository.find.mockResolvedValue([{ id: 1 }, { id: 3 }]);

    await expect(service.syncBuildingsFromApi()).resolves.toMatchObject({
      deleted: 2,
      total: 0,
    });
    expect(transactionRepository.delete).toHaveBeenCalledWith([1, 3]);
  });

  it('does not begin a transaction when SimCompanies returns invalid data', async () => {
    client.get.mockResolvedValue([{ id: 'invalid' }]);

    await expect(service.syncBuildingsFromApi()).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(repository.manager.transaction).not.toHaveBeenCalled();
  });

  it('does not begin a transaction when SimCompanies is unavailable', async () => {
    client.get.mockRejectedValue({ response: { status: 502 } });

    await expect(service.syncBuildingsFromApi()).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(repository.manager.transaction).not.toHaveBeenCalled();
  });

  it('paginates the persisted restaurants and returns 404 for an unknown ID', async () => {
    repository.findAndCount.mockResolvedValueOnce([[{ id: 1 }], 11] as never);
    await expect(
      service.getAllBuildings({ page: 2, limit: 10, sortBy: undefined }),
    ).resolves.toMatchObject({
      page: 2,
      total: 11,
      totalPages: 2,
      hasNext: false,
    });

    repository.findOneBy.mockResolvedValue(null);
    await expect(service.getBuildingById(99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lists restaurants alphabetically for Telegram', async () => {
    repository.find.mockResolvedValue([
      { id: 2, name: 'Bistró', size: 10 },
      { id: 1, name: 'Alameda', size: 20 },
    ]);

    await expect(service.listRestaurantsForTelegram()).resolves.toEqual([
      { id: 2, name: 'Bistró', size: 10 },
      { id: 1, name: 'Alameda', size: 20 },
    ]);
    expect(repository.find).toHaveBeenCalledWith({
      select: { id: true, name: true, size: true },
      where: { kind: 'r' },
      order: { name: 'ASC', id: 'ASC' },
    });
  });
});
