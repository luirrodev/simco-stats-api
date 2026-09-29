import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AxiosError } from 'axios';
import { Like, Repository } from 'typeorm';

import { PaginatedResponse } from '@common/dto/pagination.dto';
import { SimCompaniesClient } from '@features/auth/services/simcompanies-client.service';
import {
  BuildingsQueryDto,
  BuildingsSyncResponseDto,
  SimCompaniesBuildingDto,
} from '../dtos/building.dto';
import { BuildingEntity } from '../entities/building.entity';

const BUILDINGS_URL =
  'https://www.simcompanies.com/api/v2/companies/me/buildings/';
const RESTAURANT_KIND = 'r';
const BUILDINGS_REQUEST_HEADERS = {
  'x-prot': '0c346342739775fe4ea61331265ccf16',
  'x-ts': '1790459939388',
};

@Injectable()
export class BuildingService {
  constructor(
    @InjectRepository(BuildingEntity)
    private readonly buildingRepository: Repository<BuildingEntity>,
    private readonly simCompaniesClient: SimCompaniesClient,
  ) {}

  async getAllBuildings(
    query: BuildingsQueryDto,
  ): Promise<PaginatedResponse<BuildingEntity>> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'name',
      sortDir = 'ASC',
    } = query;
    const [data, total] = await this.buildingRepository.findAndCount({
      where: search ? { name: Like(`%${search}%`) } : undefined,
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

  async getBuildingById(id: number): Promise<BuildingEntity> {
    const building = await this.buildingRepository.findOneBy({ id });
    if (!building)
      throw new NotFoundException(`Building with ID ${id} was not found`);
    return building;
  }

  async listRestaurantsForTelegram(): Promise<
    Pick<BuildingEntity, 'id' | 'name'>[]
  > {
    return this.buildingRepository.find({
      select: { id: true, name: true },
      where: { kind: RESTAURANT_KIND },
      order: { name: 'ASC', id: 'ASC' },
    });
  }

  async syncBuildingsFromApi(): Promise<BuildingsSyncResponseDto> {
    const restaurants = await this.fetchRestaurants();
    return this.buildingRepository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(BuildingEntity);
      const existingBuildings = await repository.find();
      const existingIds = new Set(existingBuildings.map(({ id }) => id));
      const incomingIds = new Set(restaurants.map(({ id }) => id));
      let created = 0;
      let updated = 0;
      for (const restaurant of restaurants) {
        const values = this.toEntity(restaurant);
        if (existingIds.has(restaurant.id)) {
          await repository.update(restaurant.id, values);
          updated += 1;
        } else {
          await repository.insert(values);
          created += 1;
        }
      }
      const missingIds = existingBuildings
        .filter(({ id }) => !incomingIds.has(id))
        .map(({ id }) => id);
      if (missingIds.length) await repository.delete(missingIds);
      return {
        success: true,
        created,
        updated,
        deleted: missingIds.length,
        total: restaurants.length,
      };
    });
  }

  private async fetchRestaurants(): Promise<SimCompaniesBuildingDto[]> {
    let payload: unknown;
    try {
      payload = await this.simCompaniesClient.get<unknown>(BUILDINGS_URL, {
        headers: BUILDINGS_REQUEST_HEADERS,
      });
    } catch (error) {
      if (error instanceof AxiosError && !error.response)
        throw new ServiceUnavailableException(
          'Unable to connect to SimCompanies',
        );
      throw new BadGatewayException(
        'Unable to retrieve buildings from SimCompanies',
      );
    }
    if (!Array.isArray(payload))
      throw new BadGatewayException(
        'SimCompanies returned an invalid buildings response',
      );
    return payload
      .map((item) => this.validateBuilding(item))
      .filter(({ kind }) => kind === RESTAURANT_KIND);
  }

  private validateBuilding(value: unknown): SimCompaniesBuildingDto {
    if (typeof value !== 'object' || value === null)
      throw new BadGatewayException(
        'SimCompanies returned an invalid building record',
      );
    const building = value as Record<string, unknown>;
    if (
      typeof building.id !== 'number' ||
      !Number.isInteger(building.id) ||
      typeof building.name !== 'string' ||
      typeof building.size !== 'number' ||
      !Number.isInteger(building.size) ||
      typeof building.kind !== 'string' ||
      (building.category !== undefined &&
        typeof building.category !== 'string') ||
      (building.cost !== undefined &&
        (typeof building.cost !== 'number' || !Number.isInteger(building.cost)))
    )
      throw new BadGatewayException(
        'SimCompanies returned an invalid building record',
      );
    return {
      id: building.id,
      name: building.name,
      size: building.size,
      kind: building.kind,
      category: building.category,
      cost: building.cost,
    };
  }

  private toEntity(building: SimCompaniesBuildingDto): Partial<BuildingEntity> {
    return {
      ...building,
      category: building.category ?? null,
      cost: building.cost ?? null,
    };
  }
}
