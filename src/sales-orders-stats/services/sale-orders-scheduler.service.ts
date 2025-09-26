import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BuildingService } from 'src/building/services/building.service';
import { InjectRepository } from '@nestjs/typeorm';
import { SaleOrderEntity } from '../entities/sale-order.entity';
import { Repository } from 'typeorm';
import { QueueService } from 'src/queue/queue.service';

type BuildingData = {
  id: number;
  name: string;
};

@Injectable()
export class SaleOrdersSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SaleOrdersSchedulerService.name);
  private readonly JOB_NAME = 'sync-building';

  constructor(
    @InjectRepository(SaleOrderEntity)
    private readonly saleOrderRepository: Repository<SaleOrderEntity>,
    private readonly buildingService: BuildingService,
    private readonly queueService: QueueService,
  ) {}

  async onModuleInit() {
    this.logger.log('SaleOrdersSchedulerService inicializado.');
    const counts = await this.queueService.getJobCounts();
    this.logger.log(
      `Estado inicial de la cola 'sale-orders-sync': ${JSON.stringify(counts)}`,
    );
    const { cleaned } = await this.queueService.cleanOldJobs(24 * 7); // Limpia trabajos de más de 7 días
    if (cleaned > 0) {
      this.logger.log(
        `Se han limpiado ${cleaned} trabajos antiguos de la cola.`,
      );
    }
  }

  /**
   * Ejecuta la sincronización de sale orders todos los días a las 6:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleDailySyncSaleOrders() {
    this.logger.log(
      'Iniciando proceso diario de programación de sincronización de Sale Orders...',
    );
    let tasksScheduled = 0;
    const now = new Date();
    const buildings = await this.buildingService.getSalesOfficeIds();

    for (const building of buildings) {
      try {
        const [latestUnresolvedOrder] = await this.saleOrderRepository.find({
          where: {
            resolved: false,
            building: { id: building.id },
          },
          order: {
            datetime: 'DESC',
          },
          take: 1,
        });

        if (latestUnresolvedOrder) {
          const executionTime = new Date(
            latestUnresolvedOrder.datetime.getTime() +
              47 * 60 * 60 * 1000 +
              3 * 60 * 1000,
          );

          if (executionTime.getTime() > now.getTime()) {
            const delay = executionTime.getTime() - now.getTime();
            const jobId = `sync-${building.id}-${latestUnresolvedOrder.id}`;

            await this.queueService.scheduleJob(
              this.JOB_NAME,
              {
                buildingId: building.id,
                buildingName: building.name,
                saleOrderId: latestUnresolvedOrder.id,
              },
              delay,
              jobId,
            );

            tasksScheduled++;
            this.logScheduledJob(
              building,
              latestUnresolvedOrder,
              executionTime,
            );
          } else {
            this.logSkippedJob(building, latestUnresolvedOrder, executionTime);
          }
        } else {
          this.logger.debug(
            `No se encontraron sale orders con más de 24 horas para ${building.name}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error al programar tarea para ${building.name} (ID: ${building.id}):`,
          error,
        );
      }
    }

    const buildingText = buildings.length === 1 ? 'building' : 'buildings';
    this.logger.log(
      `Proceso nocturno completado. Se programaron ${tasksScheduled} tareas específicas de ${buildings.length} ${buildingText}`,
    );
  }

  private logScheduledJob(
    building: BuildingData,
    order: SaleOrderEntity,
    executionTime: Date,
  ) {
    const targetDateFormatted = this.formatDate(order.datetime);
    const execDateFormatted = this.formatDate(executionTime);

    this.logger.log(
      `Tarea programada para ${building.name} basada en sale order ${order.id} (${targetDateFormatted}) -> ejecutar a las ${execDateFormatted}`,
    );
  }

  private logSkippedJob(
    building: BuildingData,
    order: SaleOrderEntity,
    executionTime: Date,
  ) {
    const execDateFormatted = this.formatDate(executionTime);
    const targetDateFormatted = this.formatDate(order.datetime);

    this.logger.debug(
      `${building.name} La hora de ejecución calculada (${execDateFormatted}) ya pasó. Sale order datetime: ${targetDateFormatted}`,
    );
  }

  private formatDate(date: Date): string {
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(
      2,
      '0',
    )}/${String(date.getDate()).padStart(2, '0')} ${String(
      date.getHours(),
    ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
}
