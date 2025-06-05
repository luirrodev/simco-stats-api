import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { BuildingService } from '../services/building.service';

@Controller('buildings')
export class BuildingController {
  constructor(private readonly buildingService: BuildingService) {}

  /**
   * Sincroniza los edificios obtenidos de la API con la base de datos
   * @returns Promise con los edificios sincronizados
   */
  @Post('sync')
  async syncBuildingsFromAPI() {
    return await this.buildingService.syncBuildingsFromAPI();
  }

  /**
   * Obtiene todos los edificios de la base de datos
   * @returns Promise con la lista de todos los edificios
   */
  @Get()
  async getAllBuildings() {
    return await this.buildingService.getAllBuildings();
  }

  /**
   * Obtiene un edificio específico por su ID con sus estadísticas relacionadas
   * @param id - ID del edificio
   * @returns Promise con el edificio encontrado
   */
  @Get(':id')
  async getBuildingById(@Param('id', ParseIntPipe) id: number) {
    const building = await this.buildingService.getBuildingByIdWithStats(id);

    if (!building) {
      throw new NotFoundException(`Edificio con ID ${id} no encontrado`);
    }

    return building;
  }
}
