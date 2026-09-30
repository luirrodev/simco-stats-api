import type bull from 'bull';
import type { EventEmitter2 } from '@nestjs/event-emitter';

import { ACCOUNTING_CLOSURE_COMPLETED_EVENT } from '../accounting-closure.constants';
import type { AccountingClosureJobData } from '../accounting-closure.constants';
import { AccountingClosureProcessor } from './accounting-closure.processor';

jest.mock('@nestjs/event-emitter', () => ({ EventEmitter2: jest.fn() }));

describe('AccountingClosureProcessor', () => {
  const closureService = { createForPeriod: jest.fn() };
  const eventEmitter = {
    emit: jest.fn(),
  } as unknown as jest.Mocked<EventEmitter2>;
  const processor = new AccountingClosureProcessor(
    closureService as never,
    eventEmitter,
  );

  beforeEach(() => jest.clearAllMocks());

  it('notifies only after a newly persisted closure', async () => {
    closureService.createForPeriod.mockResolvedValue({
      created: true,
      closure: {
        id: 7,
        periodStart: new Date('2026-10-01T04:00:00.000Z'),
        periodEnd: new Date('2026-10-01T16:00:00.000Z'),
        operatingRestaurantCount: 2,
        operatingLevelCount: 30,
        totalProfit: 1200,
        pphl: 3.33,
        excludedRestaurantCount: 1,
      },
    });

    await processor.process({
      timestamp: Date.parse('2026-10-01T10:00:00.000Z'),
      opts: { prevMillis: Date.parse('2026-10-01T16:00:00.000Z') },
      data: {},
    } as unknown as bull.Job<AccountingClosureJobData>);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      ACCOUNTING_CLOSURE_COMPLETED_EVENT,
      expect.objectContaining({ closureId: 7, operatingLevelCount: 30 }),
    );
    expect(closureService.createForPeriod).toHaveBeenCalledWith(
      expect.objectContaining({ end: new Date('2026-10-01T16:00:00.000Z') }),
    );
  });

  it('does not notify again when a retry finds the existing closure', async () => {
    closureService.createForPeriod.mockResolvedValue({
      created: false,
      closure: { id: 7 },
    });

    await processor.process({
      timestamp: Date.parse('2026-10-01T16:00:00.000Z'),
      data: { periodEnd: '2026-10-01T04:00:00.000Z' },
      opts: {},
    } as unknown as bull.Job<AccountingClosureJobData>);

    expect(eventEmitter.emit).not.toHaveBeenCalled();
    expect(closureService.createForPeriod).toHaveBeenCalledWith(
      expect.objectContaining({ end: new Date('2026-10-01T04:00:00.000Z') }),
    );
  });
});
