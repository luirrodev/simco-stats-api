import { AccountingClosureScheduler } from './accounting-closure.scheduler';

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
});
