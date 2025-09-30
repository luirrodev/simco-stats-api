import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job, JobOptions, Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

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

  async scheduleJob<T>(
    name: string,
    data: T,
    delay: number,
    jobId?: string,
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

  async cleanOldJobs(ageInHours: number) {
    const jobs = await this.syncQueue.getJobs(['completed', 'failed']);
    const now = Date.now();
    let cleaned = 0;

    for (const job of jobs) {
      if (job.processedOn) {
        const jobAge = now - job.processedOn;
        if (jobAge > ageInHours * 60 * 60 * 1000) {
          await job.remove();
          cleaned++;
        }
      }
    }

    return { cleaned, total: jobs.length };
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
          createdAt: new Date(job.timestamp).toISOString(),
          willExecuteAt: new Date(processAt).toISOString(),
          remainingMs: remainingTime,
          remainingMinutes: Math.floor(remainingTime / 60000),
          remainingHours: Math.floor(remainingTime / 3600000),
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
