import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { AxiosError } from 'axios';
import { FindOptionsWhere, In, Repository } from 'typeorm';

import type { PaginatedResponse } from '@common/dto/pagination.dto';
import { SimCompaniesClient } from '@features/auth/services/simcompanies-client.service';
import { BuildingEntity } from '@features/building/entities/building.entity';
import {
  RestaurantStatsQueryDto,
  RestaurantStatsSyncAllResponseDto,
  RestaurantStatsSyncResponseDto,
  SimCompaniesRestaurantRunDto,
} from '../dtos/restaurant-stat.dto';
import { RestaurantStatEntity } from '../entities/restaurant-stat.entity';
import {
  RESTAURANT_STATS_SYNCED_EVENT,
} from '../queues/restaurant-sync.constants';
import type { RestaurantStatsSynchronizedEvent } from '../queues/restaurant-sync.constants';

const RESTAURANT_KIND = 'r';

@Injectable()
export class RestaurantStatsService {
  constructor(
    @InjectRepository(RestaurantStatEntity)
    private readonly restaurantStatRepository: Repository<RestaurantStatEntity>,
    @InjectRepository(BuildingEntity)
    private readonly buildingRepository: Repository<BuildingEntity>,
    private readonly simCompaniesClient: SimCompaniesClient,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getRestaurantStats(
    query: RestaurantStatsQueryDto,
  ): Promise<PaginatedResponse<RestaurantStatEntity>> {
    const {
      page = 1,
      limit = 10,
      restaurantId,
      resolved,
      sortBy = 'datetime',
      sortDir = 'DESC',
    } = query;
    const where: FindOptionsWhere<RestaurantStatEntity> = {};
    if (restaurantId !== undefined) where.restaurantId = restaurantId;
    if (resolved !== undefined) where.resolved = resolved;
    const [data, total] = await this.restaurantStatRepository.findAndCount({
      where,
      order: { [sortBy]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
    });
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

  async getRestaurantStatById(id: number): Promise<RestaurantStatEntity> {
    const stat = await this.restaurantStatRepository.findOneBy({ id });
    if (!stat) {
      throw new NotFoundException(
        `Restaurant stat with ID ${id} was not found`,
      );
    }
    return stat;
  }

  async syncRestaurantRuns(
    restaurantId: number,
  ): Promise<RestaurantStatsSyncResponseDto> {
    const restaurant = await this.getActiveRestaurant(restaurantId);
    const runs = await this.fetchRestaurantRuns(restaurantId);

    const result = await this.restaurantStatRepository.manager.transaction(
      async (manager) => {
        const repository = manager.getRepository(RestaurantStatEntity);
        const existingStats = runs.length
          ? await repository.findBy({ id: In(runs.map(({ id }) => id)) })
          : [];
        const existingById = new Map(
          existingStats.map((stat) => [stat.id, stat]),
        );
        const toSave: RestaurantStatEntity[] = [];
        let created = 0;
        let updated = 0;

        for (const run of runs) {
          const existing = existingById.get(run.id);
          if (existing) {
            Object.assign(existing, this.toMutableEntity(run));
            toSave.push(existing);
            updated += 1;
          } else {
            toSave.push(
              repository.create({
                ...this.toMutableEntity(run),
                id: run.id,
                restaurantId,
                restaurantName: restaurant.name,
                building: restaurant,
              }),
            );
            created += 1;
          }
        }

        if (toSave.length) await repository.save(toSave);
        return {
          success: true,
          restaurantId,
          created,
          updated,
          total: runs.length,
        };
      },
    );
    if (runs.length) {
      const latestCycleStartedAt = runs.reduce((latest, run) => {
        const datetime = new Date(run.datetime);
        return datetime > latest ? datetime : latest;
      }, new Date(runs[0].datetime));
      const event: RestaurantStatsSynchronizedEvent = {
        restaurantId,
        latestCycleStartedAt,
      };
      await this.eventEmitter.emitAsync(RESTAURANT_STATS_SYNCED_EVENT, event);
    }
    return result;
  }

  async syncAllRestaurantRuns(): Promise<RestaurantStatsSyncAllResponseDto> {
    const restaurants = await this.buildingRepository.find({
      where: { kind: RESTAURANT_KIND },
      order: { name: 'ASC' },
    });
    const results: RestaurantStatsSyncResponseDto[] = [];
    let totalCreated = 0;
    let totalUpdated = 0;
    let hasFailures = false;

    for (const restaurant of restaurants) {
      try {
        const result = await this.syncRestaurantRuns(restaurant.id);
        results.push(result);
        totalCreated += result.created;
        totalUpdated += result.updated;
      } catch (error) {
        hasFailures = true;
        results.push({
          success: false,
          restaurantId: restaurant.id,
          created: 0,
          updated: 0,
          total: 0,
          error:
            error instanceof Error
              ? error.message
              : 'Unable to synchronize restaurant statistics',
        });
      }
    }

    return { success: !hasFailures, totalCreated, totalUpdated, results };
  }

  private async getActiveRestaurant(id: number): Promise<BuildingEntity> {
    const restaurant = await this.buildingRepository.findOneBy({ id });
    if (restaurant?.kind !== RESTAURANT_KIND) {
      throw new NotFoundException(`Restaurant with ID ${id} was not found`);
    }
    return restaurant;
  }

  private async fetchRestaurantRuns(
    restaurantId: number,
  ): Promise<SimCompaniesRestaurantRunDto[]> {
    let payload: unknown;
    try {
      payload = await this.simCompaniesClient.get<unknown>(
        `https://www.simcompanies.com/api/v2/companies/buildings/${restaurantId}/restaurant-runs/`,
      );
    } catch (error) {
      if (error instanceof AxiosError && !error.response) {
        throw new ServiceUnavailableException(
          'Unable to connect to SimCompanies',
        );
      }
      throw new BadGatewayException(
        'Unable to retrieve restaurant statistics from SimCompanies',
      );
    }
    if (!Array.isArray(payload)) {
      throw new BadGatewayException(
        'SimCompanies returned an invalid restaurant statistics response',
      );
    }
    return payload.map((item) => this.validateRestaurantRun(item));
  }

  private validateRestaurantRun(value: unknown): SimCompaniesRestaurantRunDto {
    if (typeof value !== 'object' || value === null) {
      throw new BadGatewayException(
        'SimCompanies returned an invalid restaurant statistic',
      );
    }
    const run = value as Record<string, unknown>;
    const numberFields = [
      'id',
      'rating',
      'cogs',
      'wages',
      'menuPrice',
      'buildingSize',
    ];
    const integerFields = ['id', 'cogs', 'wages', 'buildingSize'];
    const optionalNumberFields = ['occupancy', 'revenue', 'newRating'];
    const isNumber = (field: string) =>
      typeof run[field] === 'number' && Number.isFinite(run[field]);

    if (
      !numberFields.every(isNumber) ||
      !integerFields.every((field) => Number.isInteger(run[field])) ||
      !optionalNumberFields.every(
        (field) => run[field] === undefined || isNumber(field),
      ) ||
      typeof run.datetime !== 'string' ||
      Number.isNaN(Date.parse(run.datetime)) ||
      typeof run.resolved !== 'boolean' ||
      typeof run.buildingIsLuxury !== 'boolean' ||
      (run.review !== undefined && typeof run.review !== 'string')
    ) {
      throw new BadGatewayException(
        'SimCompanies returned an invalid restaurant statistic',
      );
    }

    return {
      id: run.id as number,
      datetime: run.datetime,
      rating: run.rating as number,
      cogs: run.cogs as number,
      wages: run.wages as number,
      resolved: run.resolved,
      menuPrice: run.menuPrice as number,
      buildingSize: run.buildingSize as number,
      buildingIsLuxury: run.buildingIsLuxury,
      occupancy: run.occupancy as number | undefined,
      revenue: run.revenue as number | undefined,
      newRating: run.newRating as number | undefined,
      review: run.review,
    };
  }

  private toMutableEntity(
    run: SimCompaniesRestaurantRunDto,
  ): Partial<RestaurantStatEntity> {
    return {
      datetime: new Date(run.datetime),
      rating: run.rating,
      cogs: run.cogs,
      wages: run.wages,
      resolved: run.resolved,
      menuPrice: run.menuPrice,
      buildingSize: run.buildingSize,
      buildingIsLuxury: run.buildingIsLuxury,
      occupancy: run.occupancy ?? null,
      revenue: run.revenue ?? null,
      newRating: run.newRating ?? null,
      review: run.review ?? null,
    };
  }
}
