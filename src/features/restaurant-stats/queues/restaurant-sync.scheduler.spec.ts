import type { Queue } from 'bull';
import type { Repository } from 'typeorm';

import { LoggingService } from '@core/logs/services/logging.service';
import { RestaurantStatEntity } from '../entities/restaurant-stat.entity';
import {
  RESTAURANT_SYNC_ATTEMPTS,
  RESTAURANT_SYNC_JOB,
  RESTAURANT_SYNC_RETRY_DELAY_MS,
  RestaurantSyncJobData,
} from './restaurant-sync.constants';
import { RestaurantSyncScheduler } from './restaurant-sync.scheduler';

jest.mock('@nestjs/event-emitter', () => ({
  OnEvent: () => () => undefined,
}));

describe('RestaurantSyncScheduler', () => {
  const queue = {
    add: jest.fn(),
    getJob: jest.fn(),
  } as unknown as jest.Mocked<Queue<RestaurantSyncJobData>>;
  const queryBuilder = {
    select: jest.fn(),
    addSelect: jest.fn(),
    groupBy: jest.fn(),
    getRawMany: jest.fn(),
  };
  const repository = {
    createQueryBuilder: jest.fn(() => queryBuilder),
  } as unknown as jest.Mocked<Repository<RestaurantStatEntity>>;
  const logging = {
    generateRequestId: jest.fn(() => 'scheduler-request'),
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  } as unknown as jest.Mocked<LoggingService>;
  const scheduler = new RestaurantSyncScheduler(queue, repository, logging);

  beforeEach(() => {
    jest.clearAllMocks();
    queryBuilder.select.mockReturnValue(queryBuilder);
    queryBuilder.addSelect.mockReturnValue(queryBuilder);
    queryBuilder.groupBy.mockReturnValue(queryBuilder);
    queue.getJob.mockResolvedValue(null);
    queue.add.mockResolvedValue({} as never);
    jest.useFakeTimers();
  });

  afterEach(() => jest.useRealTimers());

  it('schedules the next cycle five minutes after its start', async () => {
    jest.setSystemTime(new Date('2026-09-29T00:00:00.000Z'));
    await scheduler.scheduleFromLatestCycle(
      12,
      new Date('2026-09-28T18:00:00.000Z'),
      'synchronization-success',
    );

    expect(queue.add).toHaveBeenCalledWith(
      RESTAURANT_SYNC_JOB,
      {
        restaurantId: 12,
        cycleStartedAt: '2026-09-29T06:00:00.000Z',
        scheduledAt: '2026-09-29T06:05:00.000Z',
      },
      expect.objectContaining({
        jobId: 'restaurant-sync-12-1790661600000',
        delay: 6 * 60 * 60 * 1000 + 5 * 60 * 1000,
        attempts: RESTAURANT_SYNC_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: RESTAURANT_SYNC_RETRY_DELAY_MS,
        },
      }),
    );
  });

  it('rebuilds overdue work as one immediate task for the latest elapsed cycle', async () => {
    jest.setSystemTime(new Date('2026-09-29T20:00:00.000Z'));
    queryBuilder.getRawMany.mockResolvedValue([
      {
        restaurantId: '12',
        latestCycleStartedAt: '2026-09-28T18:00:00.000Z',
      },
    ]);

    await scheduler.onApplicationBootstrap();

    expect(queue.add).toHaveBeenCalledWith(
      RESTAURANT_SYNC_JOB,
      {
        restaurantId: 12,
        cycleStartedAt: '2026-09-29T18:00:00.000Z',
        scheduledAt: '2026-09-29T18:05:00.000Z',
      },
      expect.objectContaining({ delay: 0 }),
    );
    expect(logging.log).toHaveBeenCalledWith(
      'Restaurant synchronization schedule rebuilt',
      expect.any(Object),
      { restaurants: 1 },
    );
  });

  it('does not add a duplicate job for an already scheduled cycle', async () => {
    jest.setSystemTime(new Date('2026-09-29T00:00:00.000Z'));
    queue.getJob.mockResolvedValue({
      id: 'restaurant-sync-12-1790661600000',
    } as never);

    await scheduler.scheduleFromLatestCycle(
      12,
      new Date('2026-09-28T18:00:00.000Z'),
      'bootstrap',
    );

    expect(queue.add).not.toHaveBeenCalled();
    expect(logging.debug).toHaveBeenCalledWith(
      'Restaurant synchronization task already scheduled',
      expect.any(Object),
      expect.objectContaining({ restaurantId: 12 }),
    );
  });
});
