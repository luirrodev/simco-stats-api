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

  /**
   * Obtiene las estadísticas de un restaurante específico por su ID
   * @param id - ID del restaurante
   * @returns Promise con las estadísticas del restaurante
   */
  @Get(':id')
  async getRestaurantStatById(@Param('id', ParseIntPipe) id: number) {
    return await this.restaurantStatsService.getRestaurantStatById(id);
  }

  /**
   * Obtiene todas las estadísticas de restaurantes
   * @returns Promise con todas las estadísticas de restaurantes
   */
  @Get()
  async getAllRestaurantStats() {
    return await this.restaurantStatsService.getAllRestaurantStatsLast24Hours();
  }
}
