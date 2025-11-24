import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  HttpException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BuildingService } from '../services/building.service';
import { JWTAuthGuard } from 'src/auth/guards';

@Controller('buildings')
@UseGuards(JWTAuthGuard)
export class BuildingController {
  constructor(private readonly buildingService: BuildingService) {}

  @Post('sync')
  async syncBuildingsFromAPI() {
    try {
      return await this.buildingService.syncBuildingsFromAPI();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          message: 'Error inesperado al sincronizar edificios',
          details: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  }

  @Get()
  async getAllBuildings() {
    return await this.buildingService.getAllBuildings();
  }

  @Get(':id')
  async getBuildingById(
    @Param('id', ParseIntPipe) id: number,
    @Query('statsOrders', new ParseIntPipe({ optional: true }))
    statsOrders?: number,
  ) {
    return await this.buildingService.getBuildingById(id, statsOrders);
  }
}
