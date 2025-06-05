import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RestaurantStatEntity } from '../entities/restaurant-stat.entity';
import { CreateRestaurantStatDto } from '../dto/create-restaurant-stat.dto';

@Injectable()
export class RestaurantStatsService {
  constructor(
    @InjectRepository(RestaurantStatEntity)
    private readonly restaurantStatRepository: Repository<RestaurantStatEntity>,
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
}
