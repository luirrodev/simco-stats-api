import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import { BuildingEntity } from '@features/building/entities/building.entity';
import { RestaurantStatEntity } from '@features/restaurant-stats/entities/restaurant-stat.entity';
import { RestaurantInsightsService } from './restaurant-insights.service';

describe('RestaurantInsightsService', () => {
  const queryBuilder = {
    select: jest.fn(),
    addSelect: jest.fn(),
    innerJoin: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    setParameters: jest.fn(),
    getRawOne: jest.fn(),
  };
  Object.values(queryBuilder)
    .filter((method) => method !== queryBuilder.getRawOne)
    .forEach((method) => method.mockReturnValue(queryBuilder));

  const buildingRepository = {
    findAndCount: jest.fn(),
    findOneBy: jest.fn(),
  } as unknown as jest.Mocked<Repository<BuildingEntity>>;
  const restaurantStatRepository = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => queryBuilder),
  } as unknown as jest.Mocked<Repository<RestaurantStatEntity>>;
  const service = new RestaurantInsightsService(
    buildingRepository,
    restaurantStatRepository,
  );

  beforeEach(() => jest.clearAllMocks());

  it('lists only restaurants in alphabetical, paginated order', async () => {
    buildingRepository.findAndCount.mockResolvedValue([
      [
        { id: 1, name: 'Alameda', size: 20 },
        { id: 2, name: 'Bistró', size: 10 },
      ],
      9,
    ] as never);

    await expect(
      service.listRestaurants({ page: 2, limit: 4 }),
    ).resolves.toEqual({
      data: [
        { id: 1, name: 'Alameda', size: 20 },
        { id: 2, name: 'Bistró', size: 10 },
      ],
      page: 2,
      limit: 4,
      total: 9,
      totalPages: 3,
      hasPrev: true,
      hasNext: true,
    });
    expect(buildingRepository.findAndCount).toHaveBeenCalledWith({
      select: { id: true, name: true, size: true },
      where: { kind: 'r' },
      order: { name: 'ASC', id: 'ASC' },
      skip: 4,
      take: 4,
    });
  });

  it('builds a profit overview from one aggregate query', async () => {
    buildingRepository.findOneBy.mockResolvedValue(restaurant);
    queryBuilder.getRawOne.mockResolvedValue({
      last24Hours: '100',
      last72Hours: '250',
      last7Days: '600',
    });
    const now = new Date('2026-09-29T12:00:00Z');

    await expect(service.getRestaurantOverview(12, now)).resolves.toEqual({
      restaurant: { id: 12, name: 'La Terraza', size: 10 },
      profits: { last24Hours: 100, last72Hours: 250, last7Days: 600 },
    });
    expect(restaurantStatRepository.createQueryBuilder).toHaveBeenCalledWith(
      'stat',
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'stat.resolved = :resolved',
      { resolved: true },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'stat.revenue IS NOT NULL',
    );
  });

  it('builds a global profit overview for active restaurants only', async () => {
    queryBuilder.getRawOne.mockResolvedValue({
      last24Hours: '1000',
      last72Hours: '2500',
      last7Days: '6000',
    });

    await expect(
      service.getRestaurantPortfolioOverview(new Date('2026-09-29T12:00:00Z')),
    ).resolves.toEqual({
      profits: { last24Hours: 1000, last72Hours: 2500, last7Days: 6000 },
    });
    expect(queryBuilder.innerJoin).toHaveBeenCalledWith(
      BuildingEntity,
      'restaurant',
      'restaurant.id = stat.restaurantId',
    );
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'restaurant.kind = :restaurantKind',
      { restaurantKind: 'r' },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'stat.resolved = :resolved',
      { resolved: true },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'stat.revenue IS NOT NULL',
    );
  });

  it('returns resolved history or all history according to the requested filter', async () => {
    buildingRepository.findOneBy.mockResolvedValue(restaurant);
    restaurantStatRepository.findAndCount.mockResolvedValue([
      [resolvedRun],
      5,
    ] as never);

    await expect(
      service.getRestaurantRunHistory({
        restaurantId: 12,
        page: 2,
        limit: 4,
        resolution: 'resolved',
      }),
    ).resolves.toMatchObject({
      restaurant: { id: 12, name: 'La Terraza', size: 10 },
      page: 2,
      totalPages: 2,
      data: [{ id: 101, revenue: 500 }],
    });
    expect(restaurantStatRepository.findAndCount).toHaveBeenLastCalledWith({
      where: { restaurantId: 12, resolved: true },
      order: { datetime: 'DESC' },
      skip: 4,
      take: 4,
    });

    await service.getRestaurantRunHistory({
      restaurantId: 12,
      page: 1,
      limit: 4,
      resolution: 'all',
    });
    expect(restaurantStatRepository.findAndCount).toHaveBeenLastCalledWith({
      where: { restaurantId: 12 },
      order: { datetime: 'DESC' },
      skip: 0,
      take: 4,
    });
  });

  it('returns the latest resolved cycle for a synchronization notification', async () => {
    buildingRepository.findOneBy.mockResolvedValue(restaurant);
    restaurantStatRepository.findOne.mockResolvedValue(resolvedRun);

    await expect(service.getLatestResolvedRestaurantRun(12)).resolves.toEqual({
      restaurant: { id: 12, name: 'La Terraza', size: 10 },
      stat: expect.objectContaining({ id: 101, resolved: true }),
    });
    expect(restaurantStatRepository.findOne).toHaveBeenCalledWith({
      where: { restaurantId: 12, resolved: true },
      order: { datetime: 'DESC' },
    });
  });

  it('rejects insights for an unknown or non-restaurant building', async () => {
    buildingRepository.findOneBy.mockResolvedValue(null);

    await expect(
      service.getRestaurantRunHistory({
        restaurantId: 999,
        page: 1,
        limit: 4,
        resolution: 'resolved',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

const restaurant = {
  id: 12,
  name: 'La Terraza',
  size: 10,
  kind: 'r',
} as BuildingEntity;

const resolvedRun = {
  id: 101,
  restaurantId: 12,
  datetime: new Date('2026-09-29T12:00:00Z'),
  rating: 5.5,
  newRating: 5.7,
  occupancy: 1,
  menuPrice: 60,
  cogs: 100,
  wages: 50,
  revenue: 500,
  resolved: true,
} as RestaurantStatEntity;
