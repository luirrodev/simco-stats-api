import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

import { RestaurantStatEntity } from '../entities/restaurant-stat.entity';
import { AuthService } from '../../auth/services/auth.service';

interface SyncResult {
  success: boolean;
  message: string;
  count: number;
  buildingId: number;
}

interface BuildingWithStatsRaw {
  building_id: number;
  building_name: string;
  building_size: number;
}

@Injectable()
export class RestaurantStatsService {
  constructor(
    @InjectRepository(RestaurantStatEntity)
    private readonly restaurantStatRepository: Repository<RestaurantStatEntity>,
    private readonly httpService: HttpService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Guarda un solo registro de estadística del restaurante
   * @param data - Datos de la estadística a guardar
   * @returns Promise con la entidad guardada
   */
  async saveRestaurantStat(
    data: RestaurantStatEntity,
  ): Promise<RestaurantStatEntity> {
    const restaurantStat = this.restaurantStatRepository.create({
      ...data,
      datetime: new Date(data.datetime),
    });

    return await this.restaurantStatRepository.save(restaurantStat);
  }

  /**
   * Guarda múltiples registros de estadísticas del restaurante
   * @param dataArray - Array de datos de estadísticas a guardar
   * @returns Promise con array de entidades guardadas
   */
  async saveRestaurantStats(
    dataArray: RestaurantStatEntity[],
  ): Promise<RestaurantStatEntity[]> {
    const restaurantStats = dataArray.map((data) =>
      this.restaurantStatRepository.create({
        ...data,
        datetime: new Date(data.datetime),
      }),
    );

    return await this.restaurantStatRepository.save(restaurantStats);
  }

  /**
   * Obtiene los datos de restaurant runs desde la API externa de SimCompanies
   * @param buildingId - ID del edificio del restaurante
   * @returns Promise con los datos de las estadísticas del restaurante
   */
  async fetchRestaurantRunsFromAPI(buildingId: number) {
    try {
      const url = `https://www.simcompanies.com/api/v2/companies/buildings/${buildingId}/restaurant-runs/`;

      // Obtener los headers necesarios para la petición
      const headers = await this.authService.getHeaderWithValidCookie();

      // Hacer la petición HTTP usando firstValueFrom para convertir Observable a Promise
      const response = await firstValueFrom(
        this.httpService.get<RestaurantStatEntity[]>(url, { headers }),
      );

      return response.data;
    } catch (error: unknown) {
      // Manejo de errores específico para Axios
      if (error instanceof AxiosError) {
        const axiosError = error as AxiosError;
        throw new Error(
          `Error fetching restaurant runs: ${axiosError.message} - ${axiosError.response?.status}`,
        );
      }
      // Type guard para Error genérico
      if (error instanceof Error) {
        throw new Error(`Failed to fetch restaurant runs: ${error.message}`);
      }

      // Para cualquier otro tipo de error
      throw new Error('Failed to fetch restaurant runs: Unknown error');
    }
  }

  /**
   * Verifica si ya existe un registro de restaurant stat con el mismo ID
   * @param id - ID del restaurant stat
   * @returns Promise con el registro encontrado o null
   */
  public async getRestaurantStatById(
    id: number,
  ): Promise<RestaurantStatEntity | null> {
    return await this.restaurantStatRepository.findOne({
      where: { id },
      relations: ['building'],
    });
  }

  /**
   * Obtiene las últimas dos estadísticas de cada restaurante agrupadas por restaurante
   * @returns Promise con los restaurantes y sus últimas dos estadísticas
   */
  public async getLastTwoStatsGroupedByRestaurant(): Promise<
    {
      id: number;
      name: string;
      size: number;
      stats: RestaurantStatEntity[];
    }[]
  > {
    // Obtener todos los building IDs únicos que tienen estadísticas
    const buildingsWithStats: BuildingWithStatsRaw[] =
      await this.restaurantStatRepository
        .createQueryBuilder('stat')
        .leftJoin('stat.building', 'building')
        .select([
          'building.id as building_id',
          'building.name as building_name',
          'building.size as building_size',
        ])
        .groupBy('building.id, building.name, building.size')
        .getRawMany();

    const result: {
      id: number;
      name: string;
      size: number;
      stats: RestaurantStatEntity[];
    }[] = [];

    // Para cada restaurante, obtener sus últimas 2 estadísticas
    for (const building of buildingsWithStats) {
      const stats = await this.restaurantStatRepository.find({
        where: { building: { id: building.building_id } },
        order: { datetime: 'DESC' },
        take: 2,
      });

      result.push({
        id: building.building_id,
        name: building.building_name,
        size: building.building_size,
        stats,
      });
    }

    // Ordenar por nombre del restaurante
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Sincroniza los restaurant runs de un edificio específico con la base de datos
   * @param buildingId - ID del edificio del restaurante
   * @returns Promise con el resultado de la sincronización
   */
  public async syncRestaurantRunsFromAPI(buildingId: number) {
    try {
      // Obtener datos de la API
      const restaurantRunsFromAPI =
        await this.fetchRestaurantRunsFromAPI(buildingId);

      // Guardar o actualizar los registros en la base de datos
      const savedStats: RestaurantStatEntity[] = [];

      for (const runData of restaurantRunsFromAPI) {
        const existingStat = await this.getRestaurantStatById(runData.id);

        if (existingStat) {
          // Actualizar registro existente
          await this.restaurantStatRepository.update(runData.id, runData);

          const updatedStat = await this.getRestaurantStatById(runData.id);
          if (updatedStat) {
            savedStats.push(updatedStat);
          }
        } else {
          // Crear nuevo registro con la relación al building
          const newStat = await this.saveRestaurantStat({
            ...runData,
            building: { id: buildingId },
          } as RestaurantStatEntity);
          savedStats.push(newStat);
        }
      }

      return {
        success: true,
        message: `Restaurant sincronizado correctamente`,
        count: savedStats.length,
        buildingId,
      };
    } catch (error) {
      throw new Error(
        `Error de sincronizacion para edificio ${buildingId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Sincroniza los restaurant runs de todos los edificios con la base de datos
   * @param buildingIds - Array de IDs de edificios a sincronizar
   * @returns Promise con el resultado de la sincronización
   */
  public async syncAllRestaurantRunsFromAPI(buildingIds: number[]) {
    const results: SyncResult[] = [];
    let totalCount = 0;

    for (const buildingId of buildingIds) {
      try {
        const result = await this.syncRestaurantRunsFromAPI(buildingId);
        results.push(result);
        totalCount += result.count;
      } catch (error) {
        results.push({
          success: false,
          message: `Error sincronizando edificio ${buildingId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          count: 0,
          buildingId,
        });
      }
    }

    return {
      success: true,
      message: 'Sincronización completada',
      totalCount,
      results,
    };
  }
}
