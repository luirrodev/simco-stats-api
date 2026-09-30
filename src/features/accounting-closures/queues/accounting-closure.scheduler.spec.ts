import { AccountingClosureScheduler } from './accounting-closure.scheduler';

jest.mock('@nestjs/event-emitter', () => ({ OnEvent: () => () => undefined }));

describe('AccountingClosureScheduler', () => {
  it('registers the normal schedule and queues missing periods in chronological order', async () => {
    const queue = { add: jest.fn().mockResolvedValue(undefined) };
    const closureService = {
      getMissingPeriods: jest.fn().mockResolvedValue([
        {
          start: new Date('2026-10-01T04:00:00.000Z'),
          end: new Date('2026-10-01T16:00:00.000Z'),
        },
        {
          start: new Date('2026-10-01T16:00:00.000Z'),
          end: new Date('2026-10-02T04:00:00.000Z'),
        },
      ]),
    };
    const scheduler = new AccountingClosureScheduler(
      queue as never,
      closureService as never,
    );

    await scheduler.onApplicationBootstrap();

    expect(queue.add).toHaveBeenNthCalledWith(
      1,
      'create-accounting-closure',
      {},
      expect.objectContaining({
        repeat: { cron: '0 0,12 * * *', tz: 'America/Havana' },
      }),
    );
    expect(queue.add).toHaveBeenNthCalledWith(
      2,
      'create-accounting-closure',
      { periodEnd: '2026-10-01T16:00:00.000Z' },
      expect.objectContaining({
        jobId: 'create-accounting-closure-1790870400000',
      }),
    );
    expect(queue.add).toHaveBeenNthCalledWith(
      3,
      'create-accounting-closure',
      { periodEnd: '2026-10-02T04:00:00.000Z' },
      expect.objectContaining({
        jobId: 'create-accounting-closure-1790913600000',
      }),
    );
  });

  it('queues one delayed correction per affected closure', async () => {
    const queue = { add: jest.fn().mockResolvedValue(undefined) };
    const closureService = {
      getMissingPeriods: jest.fn().mockResolvedValue([]),
      getClosuresRequiringCorrection: jest.fn().mockResolvedValue([8, 9]),
    };
    const scheduler = new AccountingClosureScheduler(queue as never, closureService as never);

    await scheduler.scheduleCorrections({ restaurantId: 42, latestCycleStartedAt: new Date() });

    expect(queue.add).toHaveBeenNthCalledWith(
      1,
      'correct-accounting-closure',
      { closureId: 8 },
      expect.objectContaining({
        jobId: 'correct-accounting-closure-8',
        delay: 5 * 60 * 1000,
      }),
    );
    expect(queue.add).toHaveBeenNthCalledWith(
      2,
      'correct-accounting-closure',
      { closureId: 9 },
      expect.objectContaining({ jobId: 'correct-accounting-closure-9' }),
    );
  });
});
