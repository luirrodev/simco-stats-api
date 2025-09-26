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
}
