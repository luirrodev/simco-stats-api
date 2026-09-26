import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Contexto de la request HTTP propagado a través del event loop
 * Permite que servicios profundos (como TypeORM subscribers) accedan
 * al usuario autenticado sin pasar parámetros a través de todas las capas
 */
export interface RequestContext {
  requestId?: string;
  userId?: number;
  storeId?: number;
  userEmail?: string;
  userRole?: string;
  ip?: string;
  userAgent?: string;
  timestamp?: Date;
}

@Injectable()
export class RequestContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

  /**
   * Inicia el contexto para una request
   * Debe llamarse en el middleware o interceptor que procesa la request
   */
  run<R>(context: RequestContext, callback: () => R): R {
    return this.asyncLocalStorage.run(context, callback);
  }

  /**
   * Inicia el contexto para ejecución asincrónica
   */
  async runAsync<R>(
    context: RequestContext,
    callback: () => Promise<R>,
  ): Promise<R> {
    return this.asyncLocalStorage.run(context, callback);
  }

  /**
   * Obtiene el contexto actual
   * Retorna el contexto guardado o un objeto vacío si no hay contexto
   */
  getContext(): RequestContext {
    return this.asyncLocalStorage.getStore() ?? {};
  }

  /**
   * Obtiene un valor específico del contexto
   */
  get<K extends keyof RequestContext>(key: K): RequestContext[K] | undefined {
    const context = this.getContext();
    return context[key];
  }

  /**
   * Obtiene el requestId del contexto
   */
  getRequestId(): string | undefined {
    return this.get('requestId');
  }

  /**
   * Obtiene la IP de la request
   */
  getIp(): string | undefined {
    return this.get('ip');
  }
}
