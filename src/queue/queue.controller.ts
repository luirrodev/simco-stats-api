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
   * Programa una sincronización de building a una hora específica (SOLO PRUEBAS)
   * @param body - Datos del trabajo (buildingId, buildingName, executeAt hora local Havana, saleOrderId opcional)
   * @returns Información del trabajo creado
   */
  @Post('test-job')
  async addTestJob(
    @Body()
    body: {
      buildingId: number;
      buildingName: string;
      executeAt: string; // Formato: "2025-09-30T11:30:00" o "11:30:00" (hora local Havana)
      saleOrderId?: number;
    },
  ) {
    const now = new Date();
    let targetTime: Date;

    // Offset para America/Havana (UTC-5)
    const offsetHours = 5;

    // Si se proporciona fecha completa, asumir que es hora local Havana
    if (body.executeAt.includes('T')) {
      targetTime = new Date(body.executeAt + '-05:00');
    } else {
      const [hours, minutes, seconds = '0'] = body.executeAt.split(':');
      // Crear fecha UTC correspondiente a la hora local Havana
      const year = now.getFullYear();
      const month = now.getMonth();
      const day = now.getDate();
      const utcHours = parseInt(hours) + offsetHours;
      targetTime = new Date(
        Date.UTC(
          year,
          month,
          day,
          utcHours,
          parseInt(minutes),
          parseInt(seconds),
        ),
      );
    }

    // Si la hora ya pasó hoy, programar para mañana
    if (targetTime.getTime() <= now.getTime()) {
      targetTime.setDate(targetTime.getDate() + 1);
    }

    const delay = targetTime.getTime() - now.getTime();
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

    // Formatear hora local para mostrar
    const formatLocalTime = (date: Date) => {
      return date.toLocaleString('es-CU', {
        timeZone: 'America/Havana',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    };

    return {
      message: 'Sincronización programada exitosamente',
      data: {
        jobId: job.id,
        name: job.name,
        buildingId: body.buildingId,
        buildingName: body.buildingName,
        currentTime: {
          iso: now.toISOString(),
          local: formatLocalTime(now),
        },
        willExecuteAt: {
          iso: targetTime.toISOString(),
          local: formatLocalTime(targetTime),
        },
        delayMs: delay,
        delayMinutes: Math.floor(delay / 60000),
        delaySeconds: Math.floor(delay / 1000),
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

  /**
   * Programa un log para ejecutarse a una hora específica (SOLO PRUEBAS)
   * @param body - Hora de ejecución y mensaje (hora local America/Havana)
   * @returns Información del job programado
   */
  @Post('schedule-log')
  async scheduleLog(
    @Body()
    body: {
      executeAt: string; // Formato: "2025-09-30T11:30:00" o "11:30:00" (hora local Havana)
      message: string;
    },
  ) {
    const now = new Date();
    let targetTime: Date;

    // Offset para America/Havana (UTC-5)
    const offsetHours = 5;

    // Si se proporciona fecha completa, asumir que es hora local Havana
    if (body.executeAt.includes('T')) {
      targetTime = new Date(body.executeAt + '-05:00');
    } else {
      const [hours, minutes, seconds = '0'] = body.executeAt.split(':');
      // Crear fecha UTC correspondiente a la hora local Havana
      const year = now.getFullYear();
      const month = now.getMonth();
      const day = now.getDate();
      const utcHours = parseInt(hours) + offsetHours;
      targetTime = new Date(
        Date.UTC(
          year,
          month,
          day,
          utcHours,
          parseInt(minutes),
          parseInt(seconds),
        ),
      );
    }

    // Si la hora ya pasó hoy, programar para mañana
    if (targetTime.getTime() <= now.getTime()) {
      targetTime.setDate(targetTime.getDate() + 1);
    }

    const delay = targetTime.getTime() - now.getTime();
    const jobId = `test-log-${Date.now()}`;

    const job = await this.queueService.scheduleJob(
      'test-log',
      {
        message: body.message,
        scheduledFor: targetTime.toISOString(),
      },
      delay,
      jobId,
    );

    // Formatear hora local para mostrar
    const formatLocalTime = (date: Date) => {
      return date.toLocaleString('es-CU', {
        timeZone: 'America/Havana',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    };

    return {
      message: 'Log programado exitosamente',
      data: {
        jobId: job.id,
        name: job.name,
        message: body.message,
        currentTime: {
          iso: now.toISOString(),
          local: formatLocalTime(now),
        },
        willExecuteAt: {
          iso: targetTime.toISOString(),
          local: formatLocalTime(targetTime),
        },
        delayMs: delay,
        delayMinutes: Math.floor(delay / 60000),
        delaySeconds: Math.floor(delay / 1000),
      },
    };
  }
}
