import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggingService } from '@core/logs/services/logging.service';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  requestId?: string;
}

const DB_ERROR_CODES: Partial<
  Record<string, { status: number; message: string }>
> = {
  '23505': { status: HttpStatus.CONFLICT, message: 'Duplicate entry' },
  '23503': { status: HttpStatus.BAD_REQUEST, message: 'Foreign key violation' },
  '23502': {
    status: HttpStatus.BAD_REQUEST,
    message: 'Missing required field',
  },
  '42P01': {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Database schema error',
  },
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly loggingService: LoggingService) {}

  private readonly isProduction = process.env.NODE_ENV === 'prod';

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, error } = this.resolveException(exception);

    // request ID desde header (si usas un middleware que lo inyecta, ej: express-request-id)
    const requestId = request.headers['x-request-id'] as string | undefined;

    const errorResponse: ErrorResponse = {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(requestId && { requestId }),
    };

    this.logError(request, statusCode, message, exception, requestId);

    response.status(statusCode).json(errorResponse);
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    message: string | string[];
    error: string;
  } {
    // 1. HttpException (ValidationPipe, guards, etc.)
    if (exception instanceof HttpException) {
      return this.resolveHttpException(exception);
    }

    // 2. Errores de base de datos (TypeORM query runner / pg driver)
    const dbError = this.resolveDbException(exception);
    if (dbError) return dbError;

    // 3. Error genérico — nunca exponer detalles en prod
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: this.isProduction
        ? 'Internal server error'
        : this.getExceptionMessage(exception),
      error: 'Internal Server Error',
    };
  }

  private resolveHttpException(exception: HttpException): {
    statusCode: number;
    message: string | string[];
    error: string;
  } {
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'object') {
      const res = exceptionResponse as Record<string, unknown>;
      const message = res.message;
      const error = res.error;

      return {
        statusCode,
        message: message ? (message as string | string[]) : exception.message,
        error: error ? (error as string) : exception.name,
      };
    }

    return {
      statusCode,
      message: exception.message,
      error: exception.name,
    };
  }

  private resolveDbException(
    exception: unknown,
  ): { statusCode: number; message: string; error: string } | null {
    if (typeof exception !== 'object' || exception === null) return null;

    // TypeORM wraps pg errors en driverError, o directamente en .code
    const error = exception as Record<string, unknown>;
    const driverError = error.driverError;
    const driverErrorCode =
      typeof driverError === 'object' && driverError !== null
        ? (driverError as Record<string, unknown>).code
        : undefined;
    const code = error.code ?? driverErrorCode;

    if (typeof code === 'string') {
      const dbError = DB_ERROR_CODES[code];
      if (!dbError) return null;

      const { status, message } = dbError;
      return { statusCode: status, message, error: 'Database Error' };
    }

    return null;
  }

  private getExceptionMessage(exception: unknown): string {
    if (typeof exception !== 'object' || exception === null) {
      return 'Unknown error';
    }

    const message = (exception as Record<string, unknown>).message;
    return typeof message === 'string' ? message : 'Unknown error';
  }

  private logError(
    request: Request,
    statusCode: number,
    message: string | string[],
    exception: unknown,
    requestId?: string,
  ): void {
    const meta = {
      method: request.method,
      url: request.url,
      statusCode,
      requestId,
      // útil para reproducir errores, cuidado con datos sensibles en prod
      ...(this.isProduction
        ? {}
        : {
            body: this.sanitizeBody(request.body),
            query: request.query,
          }),
    };

    const logMessage = `${request.method} ${request.url} → ${statusCode} | ${JSON.stringify(message)}`;

    const context = this.loggingService.createHttpContext(request, {
      endpoint: `${request.method} ${request.url}`,
      userId: request.user?.sub,
    });

    if (statusCode >= 500) {
      this.loggingService.error(logMessage, context, exception, meta);
    } else {
      this.loggingService.warn(logMessage, context, meta);
    }
  }

  private sanitizeBody(body: unknown): Record<string, unknown> | undefined {
    if (!body || typeof body !== 'object') return undefined;

    return Object.fromEntries(
      Object.entries(body as Record<string, unknown>).map(([key, value]) => [
        key,
        /password|token|secret/i.test(key) ? '[REDACTED]' : value,
      ]),
    );
  }
}
