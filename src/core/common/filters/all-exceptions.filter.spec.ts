import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

import type { LoggingService } from '@core/logs/services/logging.service';
import { GlobalExceptionFilter } from './all-exceptions.filter';

jest.mock('@core/logs/services/logging.service', () => ({
  LoggingService: jest.fn(),
}));

describe('GlobalExceptionFilter', () => {
  const createHost = (request: Request, response: Response) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    }) as unknown as ArgumentsHost;

  const createResponse = () => {
    const response = {
      status: jest.fn(),
      json: jest.fn(),
    };
    response.status.mockReturnValue(response);
    return response as unknown as Response;
  };

  const request = {
    headers: {},
    method: 'GET',
    url: '/health',
    body: {},
    query: {},
  } as unknown as Request;
  const loggingService = {
    createHttpContext: jest.fn().mockReturnValue({}),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as LoggingService;

  it('serializes HTTP exceptions', () => {
    const filter = new GlobalExceptionFilter(loggingService);
    const response = createResponse();

    filter.catch(
      new HttpException('Invalid input', HttpStatus.BAD_REQUEST),
      createHost(request, response),
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid input' }),
    );
  });

  it('maps known database error codes', () => {
    const filter = new GlobalExceptionFilter(loggingService);
    const response = createResponse();

    filter.catch({ code: '23505' }, createHost(request, response));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Database Error' }),
    );
  });

  it('returns a safe generic error response', () => {
    const filter = new GlobalExceptionFilter(loggingService);
    const response = createResponse();

    filter.catch(
      new Error('unexpected failure'),
      createHost(request, response),
    );

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'unexpected failure' }),
    );
  });
});
