import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import { randomUUID } from 'crypto';
import { LogLevel, LogData, LogContext } from '../types/log.types';

const REQUEST_ID_KEY = 'requestId';

@Injectable()
export class LoggingService {
  constructor(private eventEmitter: EventEmitter2) {}

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
  log(
    message: string,
    context: LogContext,
    metadata?: Record<string, any>,
  ): void {
    this.createLog(LogLevel.LOG, message, context, metadata);
  }

  /**
   * Log level 'debug'
   * Sincrónico - emite el evento y retorna inmediatamente
   */
  debug(
    message: string,
    context: LogContext,
    metadata?: Record<string, any>,
  ): void {
    this.createLog(LogLevel.DEBUG, message, context, metadata);
  }

  /**
   * Log level 'warn'
   * Sincrónico - emite el evento y retorna inmediatamente
   */
  warn(
    message: string,
    context: LogContext,
    metadata?: Record<string, any>,
  ): void {
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
    metadata?: Record<string, any>,
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
    metadata?: Record<string, any>,
    errorData?:
      Record<string, any> | { message: string; stack?: string; name?: string },
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
    } catch (err) {
      // Si el evento falla, al menos log en console (fallback)
      console.error('[LoggingService] Error emitting log event:', err);
    }
  }

  /**
   * Formatea un error para almacenamiento
   */
  private formatError(error?: unknown): Record<string, any> | undefined {
    if (!error) return undefined;

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return error;
  }

  /**
   * Contexto con información de request HTTP (usado por interceptor)
   */
  createHttpContext(
    req: Request,
    additionalContext?: Partial<LogContext>,
  ): LogContext {
    return {
      requestId: this.getRequestId(req),
      endpoint: `${req.method} ${req.path}`,
      method: req.method,
      ip: this.extractIp(req),
      userAgent: req.get('user-agent') || undefined,
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
    return req.ip || 'unknown';
  }
}
