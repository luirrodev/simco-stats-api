import type { NextFunction, Request, Response } from 'express';

import { RequestContextMiddleware } from './request-context.middleware';
import { RequestContextService } from '../services/request-context.service';

describe('RequestContextMiddleware', () => {
  it('propagates the request ID and forwarded client IP', () => {
    const service = new RequestContextService();
    const middleware = new RequestContextMiddleware(service);
    const next = jest.fn() as NextFunction;
    const request = {
      headers: { 'x-request-id': 'request-1' },
      get: jest.fn().mockReturnValue('198.51.100.1, 10.0.0.1'),
      ip: '127.0.0.1',
    } as unknown as Request;
    const response = {
      setHeader: jest.fn(),
    } as unknown as Response;

    middleware.use(request, response, next);

    expect(request.requestId).toBe('request-1');
    expect(response.setHeader).toHaveBeenCalledWith('x-request-id', 'request-1');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
