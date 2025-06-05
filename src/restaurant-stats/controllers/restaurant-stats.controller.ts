import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { RestaurantStatsService } from '../services/restaurant-stats.service';
import { BuildingService } from '../services/building.service';

@Controller('restaurant-stats')
export class RestaurantStatsController {
  constructor(
    private readonly restaurantStatsService: RestaurantStatsService,
    private readonly buildingService: BuildingService,
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

  /**
   * Sincroniza los restaurant runs de un edificio específico con la base de datos
   * @param buildingId - ID del edificio del restaurante
   * @returns Promise con el resultado de la sincronización
   */
  @Post('sync/:buildingId')
  async syncRestaurantRuns(
    @Param('buildingId', ParseIntPipe) buildingId: number,
  ) {
    return await this.restaurantStatsService.syncRestaurantRunsFromAPI(
      buildingId,
    );
  }

  /**
   * Sincroniza los restaurant runs de todos los edificios con la base de datos
   * @returns Promise con el resultado de la sincronización de todos los edificios
   */
  @Post('sync-all')
  async syncAllRestaurantRuns(): Promise<any> {
    // Obtener todos los edificios de la base de datos
    const buildings = await this.buildingService.getAllBuildings();

    // Extraer solo los IDs de los edificios
    const buildingIds = buildings.map((building) => building.id);

    // Sincronizar todos los restaurant runs
    return await this.restaurantStatsService.syncAllRestaurantRunsFromAPI(
      buildingIds,
    );
  }
}
