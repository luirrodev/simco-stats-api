import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job, JobOptions, Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { SaleOrderJobData } from './types/sale-order-job-data.type';
import { DateTime } from 'luxon';

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('sale-orders-sync') private readonly syncQueue: Queue,
  ) {}

  onModuleInit() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.syncQueue.on('completed', (job: Job, result: any) => {
      this.logger.log(
        `Trabajo completado: ${job.id} (${job.name}) - ${JSON.stringify(result)}`,
      );
    });

    this.syncQueue.on('failed', (job: Job | undefined, error: Error) => {
      this.logger.error(
        `Trabajo fallido: ${job?.id || 'desconocido'} (${job?.name || 'sin nombre'})`,
        error.stack,
      );
    });

    this.syncQueue.on('stalled', (job: Job) => {
      this.logger.warn(
        `Trabajo estancado: ${job.id} (${job.name}) - Reintentando...`,
      );
    });
  }

  /**
   * Programa un trabajo en la cola con datos específicos para órdenes de venta.
   * @param name - Nombre del trabajo.
   * @param data - Datos del trabajo con buildingId, buildingName y saleOrderId.
   * @param delay - Retraso en milisegundos antes de ejecutar el trabajo.
   * @param jobId - ID opcional para identificar el trabajo y evitar duplicados.
   * @returns Promise que resuelve en el trabajo programado.
   */
  async scheduleJob(
    name: string,
    data: SaleOrderJobData,
    delay: number,
    jobId: string,
  ): Promise<Job> {
    const options: JobOptions = {
      delay,
    };

    if (jobId) {
      const jobs = await this.syncQueue.getJobs([
        'waiting',
        'delayed',
        'active',
      ]);
      const existingJob = jobs.find((job) => job.opts.jobId === jobId);

      if (existingJob) {
        this.logger.log(`Eliminando trabajo duplicado: ${jobId}`);
        await existingJob.remove();
      }

      options.jobId = jobId;
    }

    return this.syncQueue.add(name, data, options);
  }

  async getJobCounts() {
    return this.syncQueue.getJobCounts();
  }

  /**
   * Formatea el tiempo restante en formato legible (ej. '2 H 30 M 45 S').
   * @param ms - Tiempo en milisegundos.
   * @returns Cadena formateada del tiempo.
   */
  private formatRemainingTime(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${hours} H ${minutes} M ${seconds} S`;
  }

  /**
   * Obtiene todos los trabajos de la cola agrupados por estado
   * @returns Objeto con trabajos agrupados por estado
   */
  async getAllJobs() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.syncQueue.getJobs(['waiting']),
      this.syncQueue.getJobs(['active']),
      this.syncQueue.getJobs(['completed']),
      this.syncQueue.getJobs(['failed']),
      this.syncQueue.getJobs(['delayed']),
    ]);

    const formatJob = (job: Job) => {
      const now = Date.now();
      const processAt = job.timestamp + (job.opts.delay || 0);
      const remainingTime = Math.max(0, processAt - now);

      return {
        id: job.id,
        name: job.name,
        data: job.data as unknown,
        opts: {
          delay: job.opts.delay,
          attempts: job.opts.attempts,
          jobId: job.opts.jobId,
        },
        timing: {
          createdAt: DateTime.fromJSDate(new Date(job.timestamp))
            .setZone('America/Havana')
            .toISO(),
          willExecuteAt: DateTime.fromJSDate(new Date(processAt))
            .setZone('America/Havana')
            .toISO(),
          remainingTimeFormatted: this.formatRemainingTime(remainingTime),
        },
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason,
      };
    };

    return {
      waiting: waiting.map(formatJob),
      active: active.map(formatJob),
      completed: completed.map(formatJob),
      failed: failed.map(formatJob),
      delayed: delayed.map(formatJob),
    };
  }

  /**
   * Limpia todos los trabajos de la cola
   * @returns Cantidad de trabajos eliminados por estado
   */
  async cleanAllJobs() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.syncQueue.getJobs(['waiting']),
      this.syncQueue.getJobs(['active']),
      this.syncQueue.getJobs(['completed']),
      this.syncQueue.getJobs(['failed']),
      this.syncQueue.getJobs(['delayed']),
    ]);

    const allJobs = [
      ...waiting,
      ...active,
      ...completed,
      ...failed,
      ...delayed,
    ];

    await Promise.all(allJobs.map((job) => job.remove()));

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      total: allJobs.length,
    };
  }
}
