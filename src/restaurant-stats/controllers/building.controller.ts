import { Controller, Get } from '@nestjs/common';
import { BuildingService } from '../services/building.service';

@Controller('buildings')
export class BuildingController {
  constructor(private readonly buildingService: BuildingService) {}

  /**
   * Obtiene un edificio específico por ID
   * @param id - ID del edificio
   * @returns Promise con el edificio encontrado
   */
  // @Get(':id')
  // async getBuildingById(@Param('id', ParseIntPipe) id: number) {
  //   return await this.buildingService.getBuildingById(id);
  // }

  /**
   * Obtiene los datos de buildings desde la API externa de SimCompanies
   * @returns Promise con los datos de los edificios filtrados (solo restaurantes)
   */
  @Get('fetch/api')
  async fetchBuildingsFromAPI() {
    return await this.buildingService.fetchBuildingsFromAPI();
  }

  /**
   * Sincroniza los edificios obtenidos de la API con la base de datos
   * @returns Promise con los edificios sincronizados
   */
  // @Post('sync')
  // async syncBuildingsFromAPI() {
  //   return await this.buildingService.syncBuildingsFromAPI();
  // }
}
