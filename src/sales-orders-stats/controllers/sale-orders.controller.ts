import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { SaleOrdersService } from '../services/sale-orders.service';
import { BuildingService } from '../../building/services/building.service';
import { SaleOrdersSchedulerService } from '../services/sale-orders-scheduler.service';
import { SaleOrdersDto } from '../dtos/sales-orders.dtos';

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
    private readonly saleOrdersSchedulerService: SaleOrdersSchedulerService,
    private readonly buildingService: BuildingService,
  ) {}

  /**
   * Obtiene todas las sale orders con paginación
   * @param page - Número de página (comenzando en 1)
   * @param pageSize - Cantidad de registros por página
   * @returns Promise con las sale orders paginadas
   */
  @Get()
  async getAllSaleOrders(@Query() params: SaleOrdersDto) {
    return await this.saleOrdersService.getAllSaleOrders(params);
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
   * Obtiene el promedio de precios por recurso en una fecha específica
   * @param date - Fecha en formato YYYY-MM-DD
   * @returns Promise con el promedio de precios por recurso
   */
  @Get('analytics/prices/:date')
  async getAveragePricesByDate(@Param('date') date: string) {
    return await this.saleOrdersService.getAveragePricesByDate(date);
  }

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

    // Filtrar solo los edificios de oficinas de ventas (kind = 'B') y que esten en operativo
    const salesOfficeBuildings = allBuildings.filter(
      (building) =>
        building.kind === 'B' &&
        !(building.name && building.name.includes('[OLD]')),
    );

    // Extraer solo los IDs de los edificios
    const buildingIds = salesOfficeBuildings.map((building) => building.id);

    // Sincronizar todas las sale orders
    return await this.saleOrdersService.syncAllSaleOrdersFromAPI(buildingIds);
  }

  /**
   * Ejecuta manualmente el proceso de sincronización diaria y programación de tareas
   */
  @Post('execute-daily-sync')
  async executeDailySyncManually() {
    try {
      await this.saleOrdersSchedulerService.handleDailySyncSaleOrders();

      return {
        success: true,
        message: 'Proceso de sincronización diaria ejecutado correctamente',
        executedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Error al ejecutar sincronización diaria: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executedAt: new Date().toISOString(),
      };
    }
  }
}
