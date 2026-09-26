import type { Queue } from 'bull';

import { LogsEventListener } from './logs-event.listener';
import { LogLevel } from '../types/log.types';

jest.mock('@nestjs/bull', () => ({
  InjectQueue: () => () => undefined,
}));

jest.mock('@nestjs/event-emitter', () => ({
  OnEvent: () => () => undefined,
}));

describe('LogsEventListener', () => {
  it('enqueues a log with retry and unique job options', async () => {
    const queue = {
      add: jest.fn().mockResolvedValue(undefined),
    } as unknown as Queue;
    const listener = new LogsEventListener(queue);

    await listener.handleLogEvent({
      level: LogLevel.LOG,
      message: 'request completed',
      context: { requestId: 'request-1', timestamp: new Date() },
    });

    expect(queue.add).toHaveBeenCalledWith(
      'process-log',
      expect.objectContaining({ message: 'request completed' }),
      expect.objectContaining({ attempts: 3, removeOnComplete: true }),
    );
  });
});
