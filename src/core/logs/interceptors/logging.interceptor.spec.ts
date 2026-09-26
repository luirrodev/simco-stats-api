import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Request, Response } from 'express';
import { lastValueFrom, of } from 'rxjs';

import type { RequestContextService } from '@common/services/request-context.service';
import type { LoggingService } from '../services/logging.service';
import { LoggingInterceptor } from './logging.interceptor';

jest.mock('../services/logging.service', () => ({
  LoggingService: jest.fn(),
}));

describe('LoggingInterceptor', () => {
  const createInterceptor = () => {
    const loggingService = {
      createHttpContext: jest.fn().mockReturnValue({ requestId: 'request-1' }),
      log: jest.fn(),
    } as unknown as LoggingService;
    const requestContext = {
      getRequestId: jest.fn().mockReturnValue('request-1'),
    } as unknown as RequestContextService;

    return { interceptor: new LoggingInterceptor(loggingService, requestContext), loggingService };
  };

  const createContext = (path: string) => {
    const request = {
      path,
      method: 'GET',
    } as unknown as Request;
    const response = { statusCode: 200 } as Response;
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
  };

  it('logs successful non-health requests asynchronously', async () => {
    jest.useFakeTimers();
    const { interceptor, loggingService } = createInterceptor();
    const next = { handle: () => of('ok') } as CallHandler;

    await lastValueFrom(interceptor.intercept(createContext('/users'), next));
    await jest.runAllTimersAsync();

    expect(loggingService.log).toHaveBeenCalledWith(
      'GET /users - 200',
      expect.any(Object),
      expect.objectContaining({ statusCode: 200 }),
    );
    jest.useRealTimers();
  });

  it('does not log successful health checks', async () => {
    const { interceptor, loggingService } = createInterceptor();
    const next = { handle: () => of('ok') } as CallHandler;

    await lastValueFrom(interceptor.intercept(createContext('/health'), next));

    expect(loggingService.log).not.toHaveBeenCalled();
  });
});
