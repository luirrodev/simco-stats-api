import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { LoggingService } from '../services/logging.service';
import { RequestContextService } from '../../common/services/request-context.service';

/**
 * Interceptor de logging global para HTTP requests
 *
 * - Loguea ÉXITOS con duration (performant) — fire-and-forget con setImmediate
 * - En ERRORES: solo relanza SIN loguear (responsabilidad del GlobalExceptionFilter)
 * - Usa RequestContextService para acceder al requestId y userId generados por middleware
 * - Excluye endpoints de healthcheck en éxito (se pollean cada 30s y no aportan valor);
 *   si fallan, igual se capturan vía GlobalExceptionFilter
 */
const EXCLUDED_SUCCESS_PATHS = new Set(['/health']);

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private loggingService: LoggingService,
    private requestContextService: RequestContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    if (EXCLUDED_SUCCESS_PATHS.has(req.path)) {
      return next.handle();
    }

    // Obtener requestId del contexto (generado por RequestContextMiddleware)
    const requestId = this.requestContextService.getRequestId();

    // Capturar tiempo de inicio
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        setImmediate(() => {
          const status = res.statusCode;

          const logContext = this.loggingService.createHttpContext(req, {
            requestId,
            timestamp: new Date(),
          });

          this.loggingService.log(
            `${req.method} ${req.path} - ${status}`,
            logContext,
            {
              statusCode: status,
              duration,
            },
          );
        });
      }),
    );
  }
}
