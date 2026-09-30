import {
  AccountingClosureService,
  getAccountingPeriod,
  getFirstAccountingPeriodEndAtOrAfter,
  getLastDueAccountingPeriodEnd,
  summarizeRuns,
} from './accounting-closure.service';

describe('AccountingClosureService helpers', () => {
  it('uses the prior 12-hour Havana window at midnight', () => {
    const period = getAccountingPeriod(new Date('2026-10-01T04:00:00.000Z'));

    expect(period.start.toISOString()).toBe('2026-09-30T16:00:00.000Z');
    expect(period.end.toISOString()).toBe('2026-10-01T04:00:00.000Z');
  });

  it('uses the prior 12-hour Havana window at noon', () => {
    const period = getAccountingPeriod(new Date('2026-10-01T16:00:00.000Z'));

    expect(period.start.toISOString()).toBe('2026-10-01T04:00:00.000Z');
    expect(period.end.toISOString()).toBe('2026-10-01T16:00:00.000Z');
  });

  it('counts each operating restaurant and its levels only once while summing its profit', () => {
    const summary = summarizeRuns([
      {
        restaurantId: 1,
        buildingSize: 10,
        revenue: 1000,
        cogs: 300,
        wages: 200,
      },
      {
        restaurantId: 1,
        buildingSize: 12,
        revenue: 900,
        cogs: 300,
        wages: 200,
      },
      {
        restaurantId: 2,
        buildingSize: 15,
        revenue: 700,
        cogs: 400,
        wages: 100,
      },
    ] as never);

    expect(summary).toEqual({ restaurants: 2, levels: 27, profit: 1100 });
  });

  it('rounds recovered cycles to their next scheduled accounting cutoff', () => {
    expect(
      getFirstAccountingPeriodEndAtOrAfter(
        new Date('2026-10-01T10:15:00.000Z'),
      ).toISOString(),
    ).toBe('2026-10-01T16:00:00.000Z');
    expect(
      getLastDueAccountingPeriodEnd(
        new Date('2026-10-02T17:00:00.000Z'),
      ).toISOString(),
    ).toBe('2026-10-02T16:00:00.000Z');
  });

  it('returns only the missing historical periods in chronological order', async () => {
    const query = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest
        .fn()
        .mockResolvedValue({ firstCycleStart: '2026-09-30T22:15:00.000Z' }),
    };
    const closureRepository = {
      find: jest
        .fn()
        .mockResolvedValue([
          { periodEnd: new Date('2026-10-02T04:00:00.000Z') },
        ]),
    };
    const restaurantStatRepository = {
      createQueryBuilder: jest.fn(() => query),
    };
    const service = new AccountingClosureService(
      closureRepository as never,
      {} as never,
      restaurantStatRepository as never,
    );

    const periods = await service.getMissingPeriods(
      new Date('2026-10-02T17:00:00.000Z'),
    );

    expect(periods.map((period) => period.end.toISOString())).toEqual([
      '2026-10-01T16:00:00.000Z',
      '2026-10-02T16:00:00.000Z',
    ]);
  });
});
