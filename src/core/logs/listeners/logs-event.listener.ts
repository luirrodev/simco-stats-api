import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import type { LogData } from '../types/log.types';

/**
 * Event Listener que escucha eventos de logs
 * y los encola en Bull/BullMQ para procesamiento asincrónico
 *
 * Patrón arquitectónico:
 * LoggingService (sync emit) → EventEmitter2 → LogsEventListener (async enqueue)
 *                                                        ↓
 *                                                   Bull Queue
 *                                                        ↓
 *                                                 LogsProcessor (batch insert)
 *
 * ⚠️ TRADE-OFF:
 * - @OnEvent por defecto ejecuta listeners de forma sincrónica
 * - Cuando handleLogEvent es async, EventEmitter2 no awaita la Promise
 *   (a menos que uses emitAsync o configures wildcard: true)
 * - En la práctica funciona porque Bull.add() se lanza igual
 * - PERO: si el proceso muere entre emit y que Bull.add() complete,
 *   el job se pierde (mismo trade-off que fire-and-forget)
 *
 * ALTERNATIVAS:
 * - Usar EventEmitter2.emitAsync() en LoggingService garantiza el await
 *   pero añade latencia (costo: ~5-10ms por log)
 * - Aceptar el riesgo (actual): muy bajo para volúmenes típicos,
 *   los logs se replican en múltiples eventos a lo largo del día
 */
@Injectable()
export class LogsEventListener {
  private readonly logger = new Logger(LogsEventListener.name);

  constructor(@InjectQueue('logs') private logsQueue: Queue) {}

  /**
   * Escucha evento 'logs.create' emitido por LoggingService
   * y encola en Bull para procesamiento en background
   *
   * ⚠️ Nota sobre jobId con timestamp:
   * El jobId incluye timestamp para garantizar unicidad incluso si múltiples
   * logs de la MISMA request se emiten en ciclos diferentes (interceptor + filtro,
   * logs manuales, etc). Bull rechazará duplicados por jobId, así que el timestamp
   * previene descartes silenciosos cuando se agregan nuevos puntos de log.
   *
   * ARQUITECTURA GARANTIZADA:
   * - Interceptor loguea éxitos (status 2xx/3xx)
   * - GlobalExceptionFilter loguea errores (exceptions)
   * - Nunca ambos logean para la misma request
   * - Pero si se agregan logs manuales, el timestamp asegura que todos se procesen
   */
  @OnEvent('logs.create')
  async handleLogEvent(logData: LogData): Promise<void> {
    try {
      await this.logsQueue.add('process-log', logData, {
        // jobId único: evita duplicados incluso con múltiples logs por request
        jobId: logData.context?.requestId
          ? `log-${logData.context.requestId}-${Date.now()}`
          : undefined,
        // Reintentos con backoff exponencial
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        // Eliminar job completado (libera memoria)
        removeOnComplete: true,
        // Mantener en Dead Letter Queue si falla (debugging)
        removeOnFail: false,
        // Procesar inmediatamente (no delay)
        delay: 0,
        // Prioridad normal
        priority: 1,
      });
    } catch (error) {
      this.logger.error(
        `Error enqueueing log to Bull: ${error instanceof Error ? error.message : String(error)}`,
      );
      // El evento se ha perdido, pero el cliente ya recibió respuesta
      // En caso de fallo persistente, ver Dead Letter Queue
    }
  }
}
