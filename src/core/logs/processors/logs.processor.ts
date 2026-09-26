import { Injectable, Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import bull from 'bull';
import { LogData } from '../types/log.types';
import { LogsPersistenceService } from '../services/logs-persistence.service';

/**
 * Processor de Bull que procesa jobs de logs
 * Recibe logs del queue y los persiste en BD sin bloquear
 */
@Processor('logs')
@Injectable()
export class LogsProcessor {
  private readonly logger = new Logger(LogsProcessor.name);

  constructor(private readonly logsPersistenceService: LogsPersistenceService) {}

  /**
   * Procesa un job de log desde la queue
   * Bull maneja reintentos automáticamente si falla
   */
  @Process('process-log')
  async processLog(job: bull.Job<LogData>): Promise<void> {
    try {
      const logData = job.data;
      await this.logsPersistenceService.addLogToBuffer(logData);
      // Job completado exitosamente, Bull lo elimina del queue
    } catch (error) {
      this.logger.error(
        `Error processing log job ${job.id}:`,
        error instanceof Error ? error.message : String(error),
      );
      // Lanzar error hace que Bull reintente (hasta 3 veces)
      throw error;
    }
  }
}
