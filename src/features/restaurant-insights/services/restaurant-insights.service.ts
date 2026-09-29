import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';

import { BuildingEntity } from '@features/building/entities/building.entity';
import { RestaurantStatEntity } from '@features/restaurant-stats/entities/restaurant-stat.entity';
import {
  PaginatedResult,
  RestaurantListItem,
  RestaurantLatestResolvedRun,
  RestaurantOverview,
  RestaurantPageRequest,
  RestaurantPortfolioOverview,
  RestaurantProfitSummary,
  RestaurantRun,
  RestaurantRunHistory,
  RestaurantRunHistoryRequest,
} from '../contracts/restaurant-insights.contract';

const RESTAURANT_KIND = 'r';
const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;

interface ProfitRow {
  last24Hours: string | number;
  last72Hours: string | number;
  last7Days: string | number;
}

@Injectable()
export class RestaurantInsightsService {
  constructor(
    @InjectRepository(BuildingEntity)
    private readonly buildingRepository: Repository<BuildingEntity>,
    @InjectRepository(RestaurantStatEntity)
    private readonly restaurantStatRepository: Repository<RestaurantStatEntity>,
  ) {}

  async listRestaurants(
    request: RestaurantPageRequest,
  ): Promise<PaginatedResult<RestaurantListItem>> {
    const { page, limit } = normalizePageRequest(request);
    const [restaurants, total] = await this.buildingRepository.findAndCount({
      select: { id: true, name: true, size: true },
      where: { kind: RESTAURANT_KIND },
      order: { name: 'ASC', id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return toPaginatedResult(
      restaurants.map(toRestaurantListItem),
      total,
      page,
      limit,
    );
  }

  async getRestaurantOverview(
    restaurantId: number,
    now: Date,
  ): Promise<RestaurantOverview> {
    const restaurant = await this.getRestaurant(restaurantId);
    const profits = await this.getProfitSummary(now, restaurantId);
    return { restaurant: toRestaurantListItem(restaurant), profits };
  }

  async getRestaurantPortfolioOverview(
    now: Date,
  ): Promise<RestaurantPortfolioOverview> {
    return { profits: await this.getProfitSummary(now) };
  }

  async getRestaurantRunHistory(
    request: RestaurantRunHistoryRequest,
  ): Promise<RestaurantRunHistory> {
    const { restaurantId, resolution } = request;
    const { page, limit } = normalizePageRequest(request);
    const restaurant = await this.getRestaurant(restaurantId);
    const where: FindOptionsWhere<RestaurantStatEntity> = { restaurantId };
    if (resolution === 'resolved') where.resolved = true;

    const [stats, total] = await this.restaurantStatRepository.findAndCount({
      where,
      order: { datetime: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      restaurant: toRestaurantListItem(restaurant),
      ...toPaginatedResult(stats.map(toRestaurantRun), total, page, limit),
    };
  }

  async getLatestResolvedRestaurantRun(
    restaurantId: number,
  ): Promise<RestaurantLatestResolvedRun> {
    const restaurant = await this.getRestaurant(restaurantId);
    const stat = await this.restaurantStatRepository.findOne({
      where: { restaurantId, resolved: true },
      order: { datetime: 'DESC' },
    });
    return {
      restaurant: toRestaurantListItem(restaurant),
      stat: stat ? toRestaurantRun(stat) : null,
    };
  }

  private async getRestaurant(id: number): Promise<BuildingEntity> {
    const restaurant = await this.buildingRepository.findOneBy({
      id,
      kind: RESTAURANT_KIND,
    });
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} was not found`);
    }
    return restaurant;
  }

  private async getProfitSummary(
    now: Date,
    restaurantId?: number,
  ): Promise<RestaurantProfitSummary> {
    const last24Hours = new Date(now.getTime() - DAY_IN_MS);
    const last72Hours = new Date(now.getTime() - 3 * DAY_IN_MS);
    const last7Days = new Date(now.getTime() - 7 * DAY_IN_MS);
    const query = this.restaurantStatRepository
      .createQueryBuilder('stat')
      .select(
        'COALESCE(SUM(CASE WHEN stat.datetime >= :last24Hours THEN stat.revenue - stat.cogs - stat.wages ELSE 0 END), 0)',
        'last24Hours',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN stat.datetime >= :last72Hours THEN stat.revenue - stat.cogs - stat.wages ELSE 0 END), 0)',
        'last72Hours',
      )
      .addSelect(
        'COALESCE(SUM(stat.revenue - stat.cogs - stat.wages), 0)',
        'last7Days',
      );

    if (restaurantId === undefined) {
      query
        .innerJoin(
          BuildingEntity,
          'restaurant',
          'restaurant.id = stat.restaurantId',
        )
        .where('restaurant.kind = :restaurantKind', {
          restaurantKind: RESTAURANT_KIND,
        });
    } else {
      query.where('stat.restaurantId = :restaurantId', { restaurantId });
    }

    const row = await query
      .andWhere('stat.resolved = :resolved', { resolved: true })
      .andWhere('stat.revenue IS NOT NULL')
      .andWhere('stat.datetime >= :last7Days', { last7Days })
      .setParameters({ last24Hours, last72Hours })
      .getRawOne<ProfitRow>();

    return {
      last24Hours: Number(row?.last24Hours ?? 0),
      last72Hours: Number(row?.last72Hours ?? 0),
      last7Days: Number(row?.last7Days ?? 0),
    };
  }
}

function normalizePageRequest(
  request: RestaurantPageRequest,
): RestaurantPageRequest {
  return {
    page: Math.max(1, Math.floor(request.page)),
    limit: Math.max(1, Math.floor(request.limit)),
  };
}

function toPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    page,
    limit,
    total,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
}

function toRestaurantListItem(
  restaurant: Pick<BuildingEntity, 'id' | 'name' | 'size'>,
): RestaurantListItem {
  return { id: restaurant.id, name: restaurant.name, size: restaurant.size };
}

function toRestaurantRun(stat: RestaurantStatEntity): RestaurantRun {
  return {
    id: stat.id,
    datetime: stat.datetime,
    rating: stat.rating,
    newRating: stat.newRating,
    occupancy: stat.occupancy,
    menuPrice: stat.menuPrice,
    cogs: stat.cogs,
    wages: stat.wages,
    revenue: stat.revenue,
    resolved: stat.resolved,
  };
}
