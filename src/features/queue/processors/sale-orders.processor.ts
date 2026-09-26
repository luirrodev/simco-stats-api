import { Processor, Process, OnQueueActive } from '@nestjs/bull';
import { Job } from 'bull';
import { SaleOrdersService } from '../../sales-orders-stats/services/sale-orders.service';
import { Logger } from '@nestjs/common';

@Processor('sale-orders-sync')
export class SaleOrdersProcessor {
  private readonly logger = new Logger(SaleOrdersProcessor.name);

  constructor(private readonly saleOrdersService: SaleOrdersService) {}

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Procesando trabajo: ${job.id} (${job.name})`);
  }

  @Process('sync-building')
  async handleBuildingSync(
    job: Job<{
      buildingId: number;
      buildingName: string;
    }>,
  ) {
    const { buildingId, buildingName } = job.data;
    const startTime = Date.now();

    try {
      this.logger.log(
        `Iniciando sincronización para ${buildingName || `building ${buildingId}`}`,
      );

      await this.saleOrdersService.syncSaleOrdersFromAPI(buildingId);

      const duration = (Date.now() - startTime) / 1000;
      this.logger.log(
        `Sincronización completada para ${buildingName || `building ${buildingId}`} en ${duration.toFixed(2)}s`,
      );

      return {
        success: true,
        duration,
      };
    } catch (error) {
      this.logger.error(
        `Error en la sincronización para ${buildingName || `building ${buildingId}`}:`,
        error,
      );
      throw error;
    }
  }
}
