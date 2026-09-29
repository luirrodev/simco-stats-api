import { BadGatewayException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import { SimCompaniesClient } from '@features/auth/services/simcompanies-client.service';
import { BuildingEntity } from '@features/building/entities/building.entity';
import { RestaurantStatEntity } from '../entities/restaurant-stat.entity';
import { RestaurantStatsService } from './restaurant-stats.service';

const restaurant = { id: 12, name: 'La Terraza', kind: 'r' } as BuildingEntity;
const openRun = {
  id: 100,
  datetime: '2026-09-26T22:00:12.163598+00:00',
  rating: 5.942756097318848,
  cogs: 382734,
  wages: 131040,
  resolved: false,
  menuPrice: 60,
  buildingSize: 10,
  buildingIsLuxury: false,
};

describe('RestaurantStatsService', () => {
  const transactionRepository = {
    findBy: jest.fn(),
    create: jest.fn(
      (data: Partial<RestaurantStatEntity>) => data as RestaurantStatEntity,
    ),
    save: jest.fn(),
  };
  const transactionManager = {
    getRepository: (_entity: typeof RestaurantStatEntity) =>
      transactionRepository,
  };
  const transaction = jest.fn(
    (callback: (manager: typeof transactionManager) => Promise<unknown>) =>
      callback(transactionManager),
  );
  const statsRepository = {
    findAndCount: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    manager: { transaction },
  } as unknown as jest.Mocked<Repository<RestaurantStatEntity>>;
  const buildingsRepository = {
    findOneBy: jest.fn(),
    find: jest.fn(),
  } as unknown as jest.Mocked<Repository<BuildingEntity>>;
  const client = {
    get: jest.fn(),
  } as unknown as jest.Mocked<SimCompaniesClient>;
  const service = new RestaurantStatsService(
    statsRepository,
    buildingsRepository,
    client,
  );

  beforeEach(() => jest.clearAllMocks());

  it('stores every endpoint field for a new restaurant cycle', async () => {
    buildingsRepository.findOneBy.mockResolvedValue(restaurant);
    client.get.mockResolvedValue([openRun]);
    transactionRepository.findBy.mockResolvedValue([]);
    transactionRepository.save.mockImplementation(
      (stats: RestaurantStatEntity[]) => Promise.resolve(stats),
    );

    await expect(service.syncRestaurantRuns(12)).resolves.toEqual({
      success: true,
      restaurantId: 12,
      created: 1,
      updated: 0,
      total: 1,
    });
    expect(client.get).toHaveBeenCalledWith(
      'https://www.simcompanies.com/api/v2/companies/buildings/12/restaurant-runs/',
    );
    expect(transactionRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 100,
        restaurantId: 12,
        restaurantName: 'La Terraza',
        building: restaurant,
        occupancy: null,
        revenue: null,
        newRating: null,
        review: null,
      }),
    ]);
  });

  it('updates an existing cycle when SimCompanies resolves it without changing its snapshot', async () => {
    const existing = {
      id: 100,
      restaurantId: 12,
      restaurantName: 'Nombre histórico',
    } as RestaurantStatEntity;
    buildingsRepository.findOneBy.mockResolvedValue(restaurant);
    client.get.mockResolvedValue([
      {
        ...openRun,
        resolved: true,
        occupancy: 1,
        revenue: 600000,
        newRating: 6.1,
        review: 'Great service',
      },
    ]);
    transactionRepository.findBy.mockResolvedValue([existing]);
    transactionRepository.save.mockImplementation(
      (stats: RestaurantStatEntity[]) => Promise.resolve(stats),
    );

    await expect(service.syncRestaurantRuns(12)).resolves.toMatchObject({
      created: 0,
      updated: 1,
    });
    expect(existing).toMatchObject({
      restaurantName: 'Nombre histórico',
      resolved: true,
      revenue: 600000,
      review: 'Great service',
    });
  });

  it('does not start a transaction when the external payload is invalid', async () => {
    buildingsRepository.findOneBy.mockResolvedValue(restaurant);
    client.get.mockResolvedValue([{ id: 100 }]);

    await expect(service.syncRestaurantRuns(12)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it('continues sync-all after an individual failure and reports it', async () => {
    const secondRestaurant = {
      id: 13,
      name: 'El Faro',
      kind: 'r',
    } as BuildingEntity;
    buildingsRepository.find.mockResolvedValue([restaurant, secondRestaurant]);
    buildingsRepository.findOneBy.mockImplementation(({ id }) =>
      Promise.resolve(id === 12 ? restaurant : secondRestaurant),
    );
    client.get.mockImplementation((url: string) => {
      if (url.includes('/12/')) return Promise.resolve([openRun]);
      return Promise.reject(new Error('Remote failure'));
    });
    transactionRepository.findBy.mockResolvedValue([]);
    transactionRepository.save.mockImplementation(
      (stats: RestaurantStatEntity[]) => Promise.resolve(stats),
    );

    await expect(service.syncAllRestaurantRuns()).resolves.toMatchObject({
      success: false,
      totalCreated: 1,
      results: [
        { success: true, restaurantId: 12 },
        {
          success: false,
          restaurantId: 13,
          error: 'Unable to retrieve restaurant statistics from SimCompanies',
        },
      ],
    });
  });

  it('paginates historical records and reports missing cycles', async () => {
    statsRepository.findAndCount.mockResolvedValueOnce([
      [{ id: 100 }],
      11,
    ] as never);
    await expect(
      service.getRestaurantStats({ restaurantId: 12, page: 2, limit: 10 }),
    ).resolves.toMatchObject({
      page: 2,
      total: 11,
      totalPages: 2,
      hasNext: false,
    });

    statsRepository.findOneBy.mockResolvedValue(null);
    await expect(service.getRestaurantStatById(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
