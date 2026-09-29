import type bull from 'bull';
import type { EventEmitter2 } from '@nestjs/event-emitter';

import { LoggingService } from '@core/logs/services/logging.service';
import { RestaurantStatsService } from '../services/restaurant-stats.service';
import {
  RESTAURANT_SYNC_ATTEMPTS,
  RestaurantSyncJobData,
} from './restaurant-sync.constants';
import { RestaurantSyncProcessor } from './restaurant-sync.processor';
import { RestaurantSyncScheduler } from './restaurant-sync.scheduler';

jest.mock('@nestjs/event-emitter', () => ({
  EventEmitter2: jest.fn(),
  OnEvent: () => () => undefined,
}));

describe('RestaurantSyncProcessor', () => {
  const restaurantStatsService = {
    syncRestaurantRuns: jest.fn(),
  } as unknown as jest.Mocked<RestaurantStatsService>;
  const scheduler = {
    scheduleFollowingCycle: jest.fn(),
  } as unknown as jest.Mocked<RestaurantSyncScheduler>;
  const logging = {
    generateRequestId: jest.fn(() => 'processor-request'),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as jest.Mocked<LoggingService>;
  const eventEmitter = {
    emit: jest.fn(),
  } as unknown as jest.Mocked<EventEmitter2>;
  const processor = new RestaurantSyncProcessor(
    restaurantStatsService,
    scheduler,
    logging,
    eventEmitter,
  );

  const createJob = (attemptsMade: number) =>
    ({
      id: 'restaurant-sync-12-1798653600000',
      attemptsMade,
      data: {
        restaurantId: 12,
        cycleStartedAt: '2026-09-29T06:00:00.000Z',
        scheduledAt: '2026-09-29T06:05:00.000Z',
      },
    }) as bull.Job<RestaurantSyncJobData>;

  beforeEach(() => jest.clearAllMocks());

  it('logs completion after a successful synchronization', async () => {
    restaurantStatsService.syncRestaurantRuns.mockResolvedValue({
      success: true,
      restaurantId: 12,
      created: 1,
      updated: 2,
      total: 3,
    });

    await expect(
      processor.processRestaurantSync(createJob(0)),
    ).resolves.toBeUndefined();

    expect(restaurantStatsService.syncRestaurantRuns).toHaveBeenCalledWith(12);
    expect(logging.log).toHaveBeenCalledWith(
      'Restaurant synchronization task completed',
      expect.any(Object),
      expect.objectContaining({ attempt: 1, created: 1, updated: 2, total: 3 }),
    );
    expect(scheduler.scheduleFollowingCycle).not.toHaveBeenCalled();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'restaurant-sync.completed',
      {
        restaurantId: 12,
        cycleStartedAt: '2026-09-29T06:00:00.000Z',
      },
    );
  });

  it('logs a retry before the fifth attempt', async () => {
    const error = new Error('SimCompanies unavailable');
    restaurantStatsService.syncRestaurantRuns.mockRejectedValue(error);

    await expect(processor.processRestaurantSync(createJob(3))).rejects.toThrow(
      error,
    );

    expect(logging.warn).toHaveBeenCalledWith(
      'Restaurant synchronization task failed and will retry',
      expect.any(Object),
      expect.objectContaining({
        attempt: 4,
        nextAttempt: 5,
        errorMessage: 'SimCompanies unavailable',
      }),
    );
    expect(scheduler.scheduleFollowingCycle).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('schedules the following cycle after the fifth failed attempt', async () => {
    const error = new Error('SimCompanies unavailable');
    restaurantStatsService.syncRestaurantRuns.mockRejectedValue(error);

    await expect(processor.processRestaurantSync(createJob(4))).rejects.toThrow(
      error,
    );

    expect(logging.error).toHaveBeenCalledWith(
      'Restaurant synchronization task exhausted all attempts',
      expect.any(Object),
      error,
      expect.objectContaining({ attempt: RESTAURANT_SYNC_ATTEMPTS }),
    );
    expect(scheduler.scheduleFollowingCycle).toHaveBeenCalledWith(
      12,
      new Date('2026-09-29T06:00:00.000Z'),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith('restaurant-sync.failed', {
      restaurantId: 12,
      cycleStartedAt: '2026-09-29T06:00:00.000Z',
      attempts: RESTAURANT_SYNC_ATTEMPTS,
      errorMessage: 'SimCompanies unavailable',
    });
  });
});
