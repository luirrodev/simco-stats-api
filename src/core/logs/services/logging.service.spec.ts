import type { EventEmitter2 } from '@nestjs/event-emitter';

import { LoggingService } from './logging.service';
import { LogLevel } from '../types/log.types';

jest.mock('@nestjs/event-emitter', () => ({
  EventEmitter2: jest.fn(),
}));

describe('LoggingService', () => {
  it('emits structured logs and normalizes primitive errors', () => {
    const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const service = new LoggingService(eventEmitter);
    const context = { requestId: 'request-1', timestamp: new Date() };

    service.error('operation failed', context, 503, { operation: 'create' });

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'logs.create',
      expect.objectContaining({
        level: LogLevel.ERROR,
        error: { message: '503' },
        metadata: { operation: 'create' },
      }),
    );
  });

  it('preserves error name, message and stack', () => {
    const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const service = new LoggingService(eventEmitter);
    const error = new Error('database unavailable');

    service.error('operation failed', { requestId: 'request-1', timestamp: new Date() }, error);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'logs.create',
      expect.objectContaining({
        error: expect.objectContaining({
          name: 'Error',
          message: 'database unavailable',
        }),
      }),
    );
  });
});
