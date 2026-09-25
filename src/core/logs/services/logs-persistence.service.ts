import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ConfigType } from '@nestjs/config';
import { Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { Log } from '../entities/log.entity';
import { AuditLog } from '../entities/audit-log.entity';

import { CreateLogDto } from '@core/logs/dtos/log.dto';
import { CreateAuditLogDto } from '@core/logs/dtos/audit-log.dto';

import { LogData } from '../types/log.types';
import config from '@utils/config';

/**
 * Servicio de persistencia con batch buffering
 *
 * ARQUITECTURA:
 * - LogsProcessor encolado por Bull (con reintentos 3x)
 * - LogsPersistenceService recibe logs y los acumula
 * - Flush automático por tamaño (por defecto 100) o por tiempo (5s)
 * - Protegido contra race conditions (flag isFlushing)
 * - Cleanup seguro al apagar app (OnApplicationShutdown)
 *
 * DECISIÓN: Bull maneja reintentos, no el buffer
 * Si la BD falla, el job fallido entra en retry automático (3 intentos)
 * El buffer NO reintentar por sí mismo (evita crecimiento infinito)
 */
@Injectable()
export class LogsPersistenceService implements OnApplicationShutdown {
  private readonly logger = new Logger(LogsPersistenceService.name);
  private logBuffer: CreateLogDto[] = [];
  private auditLogBuffer: CreateAuditLogDto[] = [];

  // Flags separados para evitar bloqueo mutuo entre buffers independientes
  private isFlushingLogs = false;
  private isFlushingAudit = false;

  // Variables de configuración (parseadas una sola vez en constructor)
  private readonly batchSize: number;
  private readonly flushTimeout: number;
  private readonly auditBatchSize: number;

  // Referencia al intervalo para cleanup
  private intervalRef!: NodeJS.Timeout;

  constructor(
    @InjectRepository(Log)
    private readonly logRepo: Repository<Log>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    @Inject(config.KEY)
    private readonly configService: ConfigType<typeof config>,
  ) {
    // Leer variables de configuración
    this.batchSize = this.configService.logs.batchSize;
    this.flushTimeout = this.configService.logs.batchTimeoutMs;
    this.auditBatchSize = this.configService.logs.auditBatchSize;

    // Inicializar flush periódico
    this.startPeriodicFlush();
  }

  /**
   * Añade log al buffer para batch insertion
   * Mayormente sincrónico — el await resuelve inmediatamente salvo cuando
   * el buffer alcanza el tamaño máximo y se hace flush
   */
  async addLogToBuffer(logData: LogData): Promise<void> {
    const createLogDto: CreateLogDto = {
      requestId: logData.context.requestId,
      level: logData.level,
      message: logData.message,
      context: logData.context,
      metadata: logData.metadata,
      statusCode: logData.statusCode,
      duration: logData.duration,
      ip: logData.context.ip,
      userAgent: logData.context.userAgent,
      userId: logData.context.userId,
      endpoint: logData.context.endpoint,
      method: logData.context.method,
      error: logData.error,
    };

    this.logBuffer.push(createLogDto);

    // Si el buffer alcanza el tamaño máximo, flush inmediato
    if (this.logBuffer.length >= this.batchSize) {
      await this.flushLogBuffer();
    }
  }

  /**
   * Añade audit log al buffer para batch insertion
   */
  async addAuditLogToBuffer(auditData: CreateAuditLogDto): Promise<void> {
    this.auditLogBuffer.push(auditData);

    if (this.auditLogBuffer.length >= this.auditBatchSize) {
      await this.flushAuditLogBuffer();
    }
  }

  /**
   * Flush de logs en batch
   * Protegido contra race condition con flag isFlushingLogs
   * Si falla, no reintentar aquí — dejar que Bull/LogsProcessor maneje reintentos
   * (LogsProcessor es parte de un job con attempts: 3 configurado)
   */
  async flushLogBuffer(): Promise<void> {
    // Evitar race condition: simultáneos flush periódico + flush por tamaño
    if (this.isFlushingLogs || this.logBuffer.length === 0) return;

    this.isFlushingLogs = true;
    try {
      const logsToInsert = [...this.logBuffer];
      this.logBuffer = [];

      // Si insert falla, lanzar — Bull reintentará el job de LogsProcessor
      // No reintentar aquí para evitar buffer infinito si BD está caída
      await this.logRepo.insert(
        logsToInsert as unknown as QueryDeepPartialEntity<Log>[],
      );
    } finally {
      this.isFlushingLogs = false;
    }
  }

  /**
   * Flush de audit logs en batch
   * Protegido contra race condition con flag isFlushingAudit
   * Independiente de isFlushingLogs para permitir ejecución paralela
   *
   * Asigna requestId en el campo de la entidad (no solo en metadata)
   * para relación directa con Log entity
   */
  async flushAuditLogBuffer(): Promise<void> {
    if (this.isFlushingAudit || this.auditLogBuffer.length === 0) return;

    this.isFlushingAudit = true;
    try {
      const auditLogsToInsert = this.auditLogBuffer.map((dto) => ({
        requestId: dto.requestId ?? null,
        entityName: dto.entityName,
        entityId: dto.entityId,
        operation: dto.operation,
        userId: dto.userId ?? null,
        changes: dto.changes,
        metadata: dto.metadata ?? null,
        loggedAt: new Date(),
      }));
      this.auditLogBuffer = [];

      await this.auditLogRepo.insert(
        auditLogsToInsert as unknown as QueryDeepPartialEntity<AuditLog>[],
      );
    } finally {
      this.isFlushingAudit = false;
    }
  }

  /**
   * Inicia flush periódico (configurado en env: LOG_BATCH_TIMEOUT_MS)
   */
  private startPeriodicFlush(): void {
    this.intervalRef = setInterval(() => {
      this.flushLogBuffer().catch((error: unknown) => {
        this.logger.error('Error flushing logs:', error);
      });
      this.flushAuditLogBuffer().catch((error: unknown) => {
        this.logger.error('Error flushing audit logs:', error);
      });
    }, this.flushTimeout);
  }

  /**
   * Obtiene el tamaño actual del buffer
   */
  getBufferStatus(): { logs: number; auditLogs: number } {
    return {
      logs: this.logBuffer.length,
      auditLogs: this.auditLogBuffer.length,
    };
  }

  /**
   * Lifecycle hook: cleanup cuando la aplicación se apaga
   * - Detiene el setInterval
   * - Hace flush final para no perder logs en transición
   * - Garantiza que la BD cierra limpiamente
   */
  async onApplicationShutdown(): Promise<void> {
    // Detener intervalo
    clearInterval(this.intervalRef);

    // Flush final para salvar logs en buffer antes de morir
    await this.flushLogBuffer();
    await this.flushAuditLogBuffer();
  }
}
