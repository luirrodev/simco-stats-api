import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import { randomUUID } from 'crypto';
import {
  JsonObject,
  LogData,
  LogLevel,
  LogContext,
  SerializedError,
} from '../types/log.types';

const REQUEST_ID_KEY = 'requestId';

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Genera un request ID único
   */
  generateRequestId(): string {
    return randomUUID();
  }

  /**
   * Obtiene o genera el request ID
   * Si hay req, lo almacena en el objeto para acceso futuro
   */
  getRequestId(req?: Request): string {
    if (req) {
      const existing = req[REQUEST_ID_KEY];
      if (existing) return existing;
      const requestId = this.generateRequestId();
      req[REQUEST_ID_KEY] = requestId;
      return requestId;
    }
    return this.generateRequestId();
  }

  /**
   * Log level 'log'
   * Sincrónico - emite el evento y retorna inmediatamente
   * El procesamiento asíncrono ocurre en LogsEventListener
   */
  log(message: string, context: LogContext, metadata?: JsonObject): void {
    this.createLog(LogLevel.LOG, message, context, metadata);
  }

  /**
   * Log level 'debug'
   * Sincrónico - emite el evento y retorna inmediatamente
   */
  debug(message: string, context: LogContext, metadata?: JsonObject): void {
    this.createLog(LogLevel.DEBUG, message, context, metadata);
  }

  /**
   * Log level 'warn'
   * Sincrónico - emite el evento y retorna inmediatamente
   */
  warn(message: string, context: LogContext, metadata?: JsonObject): void {
    this.createLog(LogLevel.WARN, message, context, metadata);
  }

  /**
   * Log level 'error'
   * Sincrónico - emite el evento y retorna inmediatamente
   */
  error(
    message: string,
    context: LogContext,
    error?: unknown,
    metadata?: JsonObject,
  ): void {
    const errorData = this.formatError(error);
    this.createLog(LogLevel.ERROR, message, context, metadata, errorData);
  }

  /**
   * Crea un log y lo emite como evento (sincrónico)
   * El procesamiento asíncrono real ocurre en:
   * LogsEventListener (encolado a Bull)  → LogsProcessor (batch insert a BD)
   */
  private createLog(
    level: LogLevel,
    message: string,
    context: LogContext,
    metadata?: JsonObject,
    errorData?: JsonObject | SerializedError,
  ): void {
    const logData: LogData = {
      level,
      message,
      context,
      metadata,
      error: errorData,
    };

    // Emitir evento sincronamente - el listener se encargará de la persistencia
    try {
      this.eventEmitter.emit('logs.create', logData);
    } catch (error: unknown) {
      this.logger.error(
        'Error emitting log event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Formatea un error para almacenamiento
   */
  private formatError(
    error?: unknown,
  ): JsonObject | SerializedError | undefined {
    if (!error) return undefined;

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    if (Array.isArray(error)) {
      return { message: JSON.stringify(error) };
    }

    if (typeof error === 'object') {
      return error as JsonObject;
    }

    if (typeof error === 'string') return { message: error };
    if (
      typeof error === 'number' ||
      typeof error === 'boolean' ||
      typeof error === 'bigint'
    ) {
      return { message: error.toString() };
    }
    if (typeof error === 'symbol') {
      return { message: error.description ?? 'Symbol' };
    }

    return { message: 'Unknown error' };
  }

  /**
   * Contexto con información de request HTTP (usado por interceptor)
   */
  createHttpContext(
    req: Request,
    additionalContext?: Partial<LogContext>,
  ): LogContext {
    const userAgent = req.get('user-agent');

    return {
      requestId: this.getRequestId(req),
      endpoint: `${req.method} ${req.path}`,
      method: req.method,
      ip: this.extractIp(req),
      userAgent: userAgent === '' ? undefined : (userAgent ?? undefined),
      userId: req.user?.sub,
      timestamp: new Date(),
      ...additionalContext,
    };
  }

  /**
   * Extrae la IP real del request (considera proxies)
   */
  private extractIp(req: Request): string {
    const forwarded = req.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip === '' ? 'unknown' : (req.ip ?? 'unknown');
  }
}
