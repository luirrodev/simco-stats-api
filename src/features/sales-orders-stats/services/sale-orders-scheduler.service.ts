import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BuildingService } from 'src/building/services/building.service';
import { InjectRepository } from '@nestjs/typeorm';
import { SaleOrderEntity } from '../entities/sale-order.entity';
import { Repository } from 'typeorm';
import { QueueService } from 'src/queue/queue.service';
import { SaleOrderJobData } from 'src/queue/types/sale-order-job-data.type';
import { DateTime } from 'luxon';
import { SaleOrdersService } from '../services/sale-orders.service';

type BuildingData = {
  id: number;
  name: string;
};

@Injectable()
export class SaleOrdersSchedulerService {
  private readonly logger = new Logger(SaleOrdersSchedulerService.name);
  private readonly JOB_NAME = 'sync-building';

  constructor(
    @InjectRepository(SaleOrderEntity)
    private readonly saleOrderRepository: Repository<SaleOrderEntity>,
    private readonly buildingService: BuildingService,
    private readonly queueService: QueueService,
    private readonly saleOrdersService: SaleOrdersService,
  ) {}

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
    const buildings = await this.buildingService.getSalesOfficeBuildings();

    for (const building of buildings) {
      await this.saleOrdersService.syncSaleOrdersFromAPI(building.id);

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

        if (!latestUnresolvedOrder) {
          continue;
        }

        const executionTime = new Date(
          latestUnresolvedOrder.datetime.getTime() +
            47 * 60 * 60 * 1000 +
            3 * 60 * 1000,
        );

        if (executionTime.getTime() > now.getTime()) {
          const delay = executionTime.getTime() - now.getTime();
          const jobId = `sync-${building.id}-${latestUnresolvedOrder.id}`;

          const jobData: SaleOrderJobData = {
            buildingId: building.id,
            buildingName: building.name,
            saleOrderId: latestUnresolvedOrder.id,
          };

          await this.queueService.scheduleJob(
            this.JOB_NAME,
            jobData,
            delay,
            jobId,
          );

          tasksScheduled++;
          this.logScheduledJob(building, latestUnresolvedOrder, executionTime);
        } else {
          this.logSkippedJob(building, latestUnresolvedOrder, executionTime);
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
      `Programacion diaria completada. Se programaron ${tasksScheduled} tareas de ${buildings.length} ${buildingText}`,
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

  /**
   * Formatea una fecha en el formato YYYY/MM/DD hh:mm a, ajustada a la zona horaria especificada.
   * @param date La fecha a formatear (objeto Date desde timestamp with time zone de DB).
   * @param timeZone Zona horaria IANA. Por defecto: 'America/Havana'.
   * @returns La fecha formateada como cadena.
   */
  private formatDate(date: Date, timeZone: string = 'America/Havana') {
    const cleanDate = DateTime.fromISO(date.toISOString()).setZone(timeZone);
    return cleanDate.toFormat('yyyy/MM/dd hh:mm a');
  }
}
