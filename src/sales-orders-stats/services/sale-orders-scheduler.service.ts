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
    const buildingIds = await this.buildingService.getSalesOfficeIds();

    for (const buildingId of buildingIds) {
      try {
        // Buscar sale orders de este building con más de 24 horas
        const oldSaleOrders = await this.saleOrderRepository.find({
          where: {
            resolved: false,
            building: { id: buildingId },
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
            targetSaleOrder.datetime.getTime() + 3 * 60 * 1000,
          );

          // Solo programar si la hora de ejecución es en el futuro
          if (executionTime.getTime() > now.getTime()) {
            const scheduleResult = this.scheduleBuildingSyncAt(
              buildingId,
              executionTime,
            );

            if (scheduleResult.success) {
              tasksScheduled++;
              this.logger.log(
                `Tarea programada para building ${buildingId} basada en sale order ${targetSaleOrder.id} (${targetSaleOrder.datetime.toISOString()}) -> ejecutar a las ${executionTime.toISOString()}`,
              );
            } else {
              this.logger.warn(
                `No se pudo programar tarea para building ${buildingId}: ${scheduleResult.message}`,
              );
            }
          } else {
            this.logger.debug(
              `Building ${buildingId}: La hora de ejecución calculada (${executionTime.toISOString()}) ya pasó. Sale order datetime: ${targetSaleOrder.datetime.toISOString()}`,
            );
          }
        } else {
          this.logger.debug(
            `Building ${buildingId}: No se encontraron sale orders con más de 24 horas`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error al programar tarea para building ${buildingId}:`,
          error,
        );
      }
    }

    this.logger.log(
      `Proceso nocturno completado. Se programaron ${tasksScheduled} tareas específicas de ${buildingIds.length} buildings`,
    );
  }
  catch(error) {
    this.logger.error('Error en el proceso nocturno:', error);
  }

  /**
   * Ejecuta la sincronización para un building específico
   * @param buildingId - ID del building a sincronizar
   */
  private async syncSpecificBuilding(buildingId: number) {
    try {
      const result =
        await this.saleOrdersService.syncSaleOrdersFromAPI(buildingId);

      if (result.success) {
        this.logger.log(
          `Building ${buildingId}: ${result.count} órdenes sincronizadas`,
        );
      } else {
        this.logger.error(`Building ${buildingId}: Error - ${result.message}`);
      }
    } catch (error) {
      this.logger.error(`Error sincronizando building ${buildingId}:`, error);
    }
  }

  /**
   * Programa la sincronización de un building específico para una hora determinada
   * @param buildingId - ID del building a sincronizar
   * @param executionTime - Fecha y hora exacta cuando ejecutar la sincronización
   * @returns Promise con información sobre la programación
   */
  public scheduleBuildingSyncAt(buildingId: number, executionTime: Date) {
    try {
      const now = new Date();
      const delayMs = executionTime.getTime() - now.getTime();

      // Generar un ID único para este timeout (usando buildingId y timestamp)
      const timeoutId = parseInt(
        `${buildingId}${Date.now().toString().slice(-6)}`,
      );

      // Programar la sincronización
      const timeout = setTimeout(() => {
        this.logger.log(
          `Ejecutando sincronización programada para building ${buildingId} a las ${executionTime.toISOString()}`,
        );

        this.syncSpecificBuilding(buildingId)
          .then(() => {
            this.logger.log(
              `Sincronización programada completada para building ${buildingId}`,
            );
          })
          .catch((error) => {
            this.logger.error(
              `Error en sincronización programada para building ${buildingId}:`,
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

      this.logger.log(
        `Programada sincronización automatica para building ${buildingId} en ${Math.round(delayMs / 1000)} segundos (${executionTime.toISOString()})`,
      );

      return {
        success: true,
        message: `Sincronización programada exitosamente para building ${buildingId}`,
        scheduledFor: executionTime.toISOString(),
        delayMs: delayMs,
      };
    } catch (error) {
      this.logger.error(
        `Error al programar sincronización para building ${buildingId}:`,
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
