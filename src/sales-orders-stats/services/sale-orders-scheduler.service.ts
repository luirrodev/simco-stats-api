import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SaleOrdersService } from './sale-orders.service';
import { BuildingService } from '../../building/services/building.service';
import { InjectRepository } from '@nestjs/typeorm';
import { SaleOrderEntity } from '../entities/sale-order.entity';
import { LessThan, Repository } from 'typeorm';

@Injectable()
export class SaleOrdersSchedulerService {
  private readonly logger = new Logger(SaleOrdersSchedulerService.name);
  private scheduledTimeouts = new Map<number, NodeJS.Timeout>(); // Para rastrear timeouts programados

  constructor(
    @InjectRepository(SaleOrderEntity)
    private readonly saleOrderRepository: Repository<SaleOrderEntity>,
    private readonly saleOrdersService: SaleOrdersService,
    private readonly buildingService: BuildingService,
  ) {}

  /**
   * Ejecuta la sincronización de sale orders todos los días a las 12:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleDailySyncSaleOrders() {
    let tasksScheduled = 0;
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const buildings = await this.buildingService.getSalesOfficeIds();

    for (const building of buildings) {
      try {
        // Buscar sale orders de este building con más de 24 horas
        const oldSaleOrders = await this.saleOrderRepository.find({
          where: {
            resolved: false,
            building: { id: building.id },
            datetime: LessThan(twentyFourHoursAgo),
          },
          order: {
            datetime: 'DESC', // Ordenar por datetime descendente para obtener la más reciente
          },
          take: 1, // Solo tomar la primera (más reciente)
        });

        if (oldSaleOrders.length > 0) {
          const targetSaleOrder = oldSaleOrders[0];

          // Calcular la hora de ejecución: datetime + 3 minutos
          const executionTime = new Date(
            targetSaleOrder.datetime.getTime() +
              47 * 60 * 60 * 1000 +
              3 * 60 * 1000,
          );

          // Solo programar si la hora de ejecución es en el futuro
          if (executionTime.getTime() > now.getTime()) {
            const scheduleResult = this.scheduleBuildingSyncAt(
              building.id,
              executionTime,
              building.name,
            );

            if (scheduleResult.success) {
              tasksScheduled++;
              const targetDate = new Date(targetSaleOrder.datetime);
              const targetDateFormatted = `${targetDate.getFullYear()}/${String(targetDate.getMonth() + 1).padStart(2, '0')}/${String(targetDate.getDate()).padStart(2, '0')} ${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}:${String(targetDate.getSeconds()).padStart(2, '0')}`;
              const execDateFormatted = `${executionTime.getFullYear()}/${String(executionTime.getMonth() + 1).padStart(2, '0')}/${String(executionTime.getDate()).padStart(2, '0')} ${String(executionTime.getHours()).padStart(2, '0')}:${String(executionTime.getMinutes()).padStart(2, '0')}:${String(executionTime.getSeconds()).padStart(2, '0')}`;

              this.logger.log(
                `Tarea programada para ${building.name} basada en sale order ${targetSaleOrder.id} (${targetDateFormatted}) -> ejecutar a las ${execDateFormatted}`,
              );
            } else {
              const targetDate = new Date(targetSaleOrder.datetime);
              const targetDateFormatted = `${targetDate.getFullYear()}/${String(targetDate.getMonth() + 1).padStart(2, '0')}/${String(targetDate.getDate()).padStart(2, '0')} ${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}:${String(targetDate.getSeconds()).padStart(2, '0')}`;
              const execDateFormatted = `${executionTime.getFullYear()}/${String(executionTime.getMonth() + 1).padStart(2, '0')}/${String(executionTime.getDate()).padStart(2, '0')} ${String(executionTime.getHours()).padStart(2, '0')}:${String(executionTime.getMinutes()).padStart(2, '0')}:${String(executionTime.getSeconds()).padStart(2, '0')}`;

              this.logger.warn(
                `No se pudo programar tarea para ${building.name} basada en sale order ${targetSaleOrder.id} (${targetDateFormatted}) -> ejecutar a las ${execDateFormatted}`,
              );
            }
          } else {
            const execDateFormatted = `${executionTime.getFullYear()}/${String(executionTime.getMonth() + 1).padStart(2, '0')}/${String(executionTime.getDate()).padStart(2, '0')} ${String(executionTime.getHours()).padStart(2, '0')}:${String(executionTime.getMinutes()).padStart(2, '0')}:${String(executionTime.getSeconds()).padStart(2, '0')}`;
            const targetDate = new Date(targetSaleOrder.datetime);
            const targetDateFormatted = `${targetDate.getFullYear()}/${String(targetDate.getMonth() + 1).padStart(2, '0')}/${String(targetDate.getDate()).padStart(2, '0')} ${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}:${String(targetDate.getSeconds()).padStart(2, '0')}`;

            this.logger.debug(
              `${building.name} La hora de ejecución calculada (${execDateFormatted}) ya pasó. Sale order datetime: ${targetDateFormatted}`,
            );
          }
        } else {
          this.logger.debug(
            `${building.name} No se encontraron sale orders con más de 24 horas`,
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

  /**
   * Programa la sincronización de un building específico para una hora determinada
   * @param buildingId - ID del building a sincronizar
   * @param executionTime - Fecha y hora exacta cuando ejecutar la sincronización
   * @returns Promise con información sobre la programación
   */
  public scheduleBuildingSyncAt(
    buildingId: number,
    executionTime: Date,
    buildingName?: string,
  ) {
    try {
      const now = new Date();
      const delayMs = executionTime.getTime() - now.getTime();

      // Generar un ID único para este timeout (usando buildingId y timestamp)
      const timeoutId = parseInt(
        `${buildingId}${Date.now().toString().slice(-6)}`,
      );

      // Programar la sincronización
      const timeout = setTimeout(() => {
        const execDateFormatted = `${executionTime.getFullYear()}/${String(executionTime.getMonth() + 1).padStart(2, '0')}/${String(executionTime.getDate()).padStart(2, '0')} ${String(executionTime.getHours()).padStart(2, '0')}:${String(executionTime.getMinutes()).padStart(2, '0')}:${String(executionTime.getSeconds()).padStart(2, '0')}`;

        this.logger.log(
          `Ejecutando sincronización programada para ${buildingName || `building ${buildingId}`} a las ${execDateFormatted}`,
        );

        this.saleOrdersService
          .syncSaleOrdersFromAPI(buildingId)
          .then(() => {
            this.logger.log(
              `Sincronización programada completada para ${buildingName || `building ${buildingId}`}`,
            );
          })
          .catch((error) => {
            this.logger.error(
              `Error en sincronización programada para ${buildingName || `building ${buildingId}`}:`,
              error,
            );
          })
          .finally(() => {
            // Remover el timeout del mapa una vez ejecutado
            this.scheduledTimeouts.delete(timeoutId);
          });
      }, delayMs);

      // Guardar el timeout en el mapa
      this.scheduledTimeouts.set(timeoutId, timeout);

      // Formatear el tiempo restante
      const seconds = Math.floor((delayMs / 1000) % 60);
      const minutes = Math.floor((delayMs / (1000 * 60)) % 60);
      const hours = Math.floor((delayMs / (1000 * 60 * 60)) % 24);
      const days = Math.floor(delayMs / (1000 * 60 * 60 * 24));

      let timeRemaining = '';
      if (days > 0) timeRemaining += `${days}d `;
      if (hours > 0) timeRemaining += `${hours}h `;
      if (minutes > 0) timeRemaining += `${minutes}m `;
      timeRemaining += `${seconds}s`;

      // Formatear la fecha de ejecución
      const execDate = new Date(executionTime);
      const formattedDate = `${execDate.getFullYear()}/${String(execDate.getMonth() + 1).padStart(2, '0')}/${String(execDate.getDate()).padStart(2, '0')} ${String(execDate.getHours()).padStart(2, '0')}:${String(execDate.getMinutes()).padStart(2, '0')}:${String(execDate.getSeconds()).padStart(2, '0')}`;

      this.logger.log(
        `Programada sincronización automática para ${buildingName || `building ${buildingId}`} en ${timeRemaining} (${formattedDate})`,
      );

      return {
        success: true,
        message: `Sincronización programada exitosamente para building ${buildingId}`,
        scheduledFor: executionTime.toISOString(),
        delayMs: delayMs,
      };
    } catch (error) {
      this.logger.error(
        `Error al programar sincronización para ${buildingName || `building ${buildingId}`}:`,
        error,
      );

      return {
        success: false,
        message: `Error al programar sincronización: ${error instanceof Error ? error.message : 'Unknown error'}`,
        scheduledFor: executionTime.toISOString(),
        delayMs: 0,
      };
    }
  }
}
