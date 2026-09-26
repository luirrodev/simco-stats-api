import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';

import { RequestContextService } from '@core/common/services/request-context.service';

import { LoggingService } from './logging.service';
import { LogContext } from '../types/log.types';

// Contexts internos de Nest emitidos durante el arranque (InstanceLoader, RoutesResolver, ...)
// Se mantienen visibles en consola pero no se persisten para no llenar la tabla `logs` de ruido.
const NEST_INTERNAL_CONTEXTS = new Set([
  'NestFactory',
  'NestApplication',
  'InstanceLoader',
  'RoutesResolver',
  'RouterExplorer',
  'WebSocketsController',
]);

@Injectable({ scope: Scope.DEFAULT })
export class AppLoggerService extends ConsoleLogger {
  constructor(
    private readonly loggingService: LoggingService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  log(message: unknown, context?: string): void {
    super.log(message, context);
    this.persist('log', message, context);
  }

  warn(message: unknown, context?: string): void {
    super.warn(message, context);
    this.persist('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    super.debug(message, context);
    this.persist('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    super.verbose(message, context);
    this.persist('debug', message, context);
  }

  error(message: unknown, stack?: string, context?: string): void {
    super.error(message, stack, context);
    if (context && NEST_INTERNAL_CONTEXTS.has(context)) return;

    this.loggingService.error(
      this.formatMessageText(message),
      this.buildContext(),
      stack ? { message: this.formatMessageText(message), stack } : undefined,
      context ? { source: context } : undefined,
    );
  }

  private persist(
    level: 'log' | 'warn' | 'debug',
    message: unknown,
    context?: string,
  ): void {
    if (context && NEST_INTERNAL_CONTEXTS.has(context)) return;

    const text = this.formatMessageText(message);
    const metadata = context ? { source: context } : undefined;
    const logContext = this.buildContext();

    if (level === 'log') this.loggingService.log(text, logContext, metadata);
    else if (level === 'warn')
      this.loggingService.warn(text, logContext, metadata);
    else this.loggingService.debug(text, logContext, metadata);
  }

  private buildContext(): LogContext {
    return {
      requestId:
        this.requestContextService.getRequestId() ??
        this.loggingService.generateRequestId(),
      userId: this.requestContextService.get('userId'),
      ip: this.requestContextService.getIp(),
      timestamp: new Date(),
    };
  }

  private formatMessageText(message: unknown): string {
    if (typeof message === 'string') return message;
    if (message instanceof Error) return message.message;
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
}
