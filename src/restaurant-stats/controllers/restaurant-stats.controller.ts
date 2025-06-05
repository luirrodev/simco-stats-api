import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { RestaurantStatsService } from '../services/restaurant-stats.service';

@Controller('restaurant-stats')
export class RestaurantStatsController {
  constructor(
    private readonly restaurantStatsService: RestaurantStatsService,
  ) {}

  /**
   * Obtiene los datos de restaurant runs desde la API externa de SimCompanies
   * @param buildingId - ID del edificio del restaurante
   * @returns Promise con los datos de las estadísticas del restaurante
   */
  @Get('fetch/:buildingId')
  async fetchRestaurantRuns(
    @Param('buildingId', ParseIntPipe) buildingId: number,
  ) {
    return await this.restaurantStatsService.fetchRestaurantRunsFromAPI(
      buildingId,
    );
  }
}
