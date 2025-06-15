import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { SaleOrdersService } from '../services/sale-orders.service';
import { BuildingService } from '../../restaurant-stats/services/building.service';

export interface SyncResult {
  success: boolean;
  message: string;
  count: number;
  buildingId: number;
}

@Controller('sale-orders')
export class SaleOrdersController {
  constructor(
    private readonly saleOrdersService: SaleOrdersService,
    private readonly buildingService: BuildingService,
  ) {}

  /**
   * Sincroniza las sale orders de un edificio específico con la base de datos
   * @param buildingId - ID del edificio de la oficina de ventas
   * @returns Promise con el resultado de la sincronización
   */
  @Post('sync/:buildingId')
  async syncSaleOrders(
    @Param('buildingId', ParseIntPipe) buildingId: number,
  ): Promise<SyncResult> {
    return await this.saleOrdersService.syncSaleOrdersFromAPI(buildingId);
  }

  /**
   * Sincroniza las sale orders de todos los edificios de oficinas de ventas con la base de datos
   * @returns Promise con el resultado de la sincronización de todos los edificios
   */
  @Post('sync-all')
  async syncAllSaleOrders(): Promise<any> {
    // Obtener todos los edificios de la base de datos
    const allBuildings = await this.buildingService.getAllBuildings();

    // Filtrar solo los edificios de oficinas de ventas (kind = 'O')
    const salesOfficeBuildings = allBuildings.filter(
      (building) => building.kind === 'B',
    );

    // Extraer solo los IDs de los edificios
    const buildingIds = salesOfficeBuildings.map((building) => building.id);

    // Sincronizar todas las sale orders
    return await this.saleOrdersService.syncAllSaleOrdersFromAPI(buildingIds);
  }

  /**
   * Obtiene una sale order específica por su ID
   * @param id - ID de la sale order
   * @returns Promise con la sale order
   */
  @Get(':id')
  async getSaleOrderById(@Param('id', ParseIntPipe) id: number) {
    return await this.saleOrdersService.getSaleOrderById(id);
  }

  /**
   * Obtiene todas las sale orders con paginación opcional
   * @param limit - Límite de registros a retornar (opcional)
   * @returns Promise con las sale orders
   */
  @Get()
  async getAllSaleOrders(@Query('limit', ParseIntPipe) limit?: number) {
    return await this.saleOrdersService.getAllSaleOrders(limit);
  }

  /**
   * Obtiene las sale orders resueltas
   * @param limit - Límite de registros a retornar (opcional)
   * @returns Promise con las sale orders resueltas
   */
  @Get('status/resolved')
  async getResolvedSaleOrders(@Query('limit', ParseIntPipe) limit?: number) {
    return await this.saleOrdersService.getResolvedSaleOrders(limit);
  }

  /**
   * Obtiene las sale orders pendientes (no resueltas)
   * @param limit - Límite de registros a retornar (opcional)
   * @returns Promise con las sale orders pendientes
   */
  @Get('status/pending')
  async getPendingSaleOrders(@Query('limit', ParseIntPipe) limit?: number) {
    return await this.saleOrdersService.getPendingSaleOrders(limit);
  }

  /**
   * Obtiene sale orders de un edificio específico
   * @param buildingId - ID del edificio
   * @param limit - Límite de registros a retornar (opcional)
   * @returns Promise con las sale orders del edificio
   */
  @Get('building/:buildingId')
  async getSaleOrdersByBuilding(
    @Param('buildingId', ParseIntPipe) buildingId: number,
    @Query('limit', ParseIntPipe) limit?: number,
  ) {
    return await this.saleOrdersService.getSaleOrdersByBuilding(
      buildingId,
      limit,
    );
  }

  /**
   * Obtiene estadísticas básicas de sale orders
   * @returns Promise con las estadísticas
   */
  @Get('analytics/stats')
  async getSaleOrdersStats() {
    return await this.saleOrdersService.getSaleOrdersStats();
  }
}
