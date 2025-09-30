import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { QueueService } from './queue.service';

/**
 * Controlador para probar y administrar la cola de sincronización de sale orders
 */
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  /**
   * Obtiene las estadísticas actuales de la cola
   * @returns Contadores de trabajos por estado
   */
  @Get('stats')
  async getQueueStats() {
    const counts = await this.queueService.getJobCounts();
    return {
      message: 'Estadísticas de la cola',
      data: counts,
    };
  }

  /**
   * Programa un trabajo de sincronización de prueba
   * @param body - Datos del trabajo (buildingId, buildingName, delay en ms)
   * @returns Información del trabajo creado
   */
  @Post('test-job')
  async addTestJob(
    @Body()
    body: {
      buildingId: number;
      buildingName: string;
      delay?: number;
      saleOrderId?: number;
    },
  ) {
    const delay = body.delay || 5000; // 5 segundos por defecto
    const jobId = `test-sync-${body.buildingId}-${Date.now()}`;

    const job = await this.queueService.scheduleJob(
      'sync-building',
      {
        buildingId: body.buildingId,
        buildingName: body.buildingName,
        saleOrderId: body.saleOrderId,
      },
      delay,
      jobId,
    );

    return {
      message: 'Trabajo de prueba programado',
      data: {
        jobId: job.id,
        name: job.name,
        delay,
        executeAt: new Date(Date.now() + delay).toISOString(),
      },
    };
  }

  /**
   * Limpia trabajos antiguos de la cola
   * @param hours - Edad mínima en horas de los trabajos a limpiar
   * @returns Cantidad de trabajos limpiados
   */
  @Delete('clean/:hours')
  async cleanOldJobs(@Param('hours') hours: string) {
    const ageInHours = parseInt(hours, 10);
    const result = await this.queueService.cleanOldJobs(ageInHours);

    return {
      message: `Limpieza de trabajos completada`,
      data: result,
    };
  }

  /**
   * Obtiene todos los trabajos en la cola
   * @returns Lista de trabajos por estado
   */
  @Get('jobs')
  async getAllJobs() {
    const jobs = await this.queueService.getAllJobs();

    return {
      message: 'Trabajos en la cola',
      data: jobs,
    };
  }

  /**
   * Limpia todos los trabajos de la cola
   * @returns Cantidad de trabajos eliminados
   */
  @Delete('clean-all')
  async cleanAllJobs() {
    const result = await this.queueService.cleanAllJobs();

    return {
      message: 'Todos los trabajos han sido eliminados',
      data: result,
    };
  }
}
