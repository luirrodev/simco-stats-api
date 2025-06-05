import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

import { RestaurantStatEntity } from '../entities/restaurant-stat.entity';
import { CreateRestaurantStatDto } from '../dto/create-restaurant-stat.dto';
import { AuthService } from '../../auth/services/auth.service';

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
    data: CreateRestaurantStatDto,
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
    dataArray: CreateRestaurantStatDto[],
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
        this.httpService.get<CreateRestaurantStatDto[]>(url, { headers }),
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
}
