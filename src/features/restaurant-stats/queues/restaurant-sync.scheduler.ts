import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { OnEvent } from '@nestjs/event-emitter';
import type { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoggingService } from '@core/logs/services/logging.service';
import { RestaurantStatEntity } from '../entities/restaurant-stat.entity';
import {
  RESTAURANT_CYCLE_DURATION_MS,
  RESTAURANT_STATS_SYNCED_EVENT,
  RESTAURANT_SYNC_ATTEMPTS,
  RESTAURANT_SYNC_JOB,
  RESTAURANT_SYNC_OFFSET_MS,
  RESTAURANT_SYNC_QUEUE,
  RESTAURANT_SYNC_RETRY_DELAY_MS,
} from './restaurant-sync.constants';
import type {
  RestaurantStatsSynchronizedEvent,
  RestaurantSyncJobData,
} from './restaurant-sync.constants';

interface LatestCycleRow {
  restaurantId: string | number;
  latestCycleStartedAt: string | Date;
}

@Injectable()
export class RestaurantSyncScheduler implements OnApplicationBootstrap {
  constructor(
    @InjectQueue(RESTAURANT_SYNC_QUEUE)
    private readonly restaurantSyncQueue: Queue<RestaurantSyncJobData>,
    @InjectRepository(RestaurantStatEntity)
    private readonly restaurantStatRepository: Repository<RestaurantStatEntity>,
    private readonly loggingService: LoggingService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const latestCycles = await this.getLatestCycles();
      for (const cycle of latestCycles) {
        await this.scheduleFromLatestCycle(
          Number(cycle.restaurantId),
          new Date(cycle.latestCycleStartedAt),
          'bootstrap',
        );
      }
      this.log('log', 'Restaurant synchronization schedule rebuilt', {
        restaurants: latestCycles.length,
      });
    } catch (error) {
      this.log(
        'error',
        'Unable to rebuild restaurant synchronization schedule',
        {},
        error,
      );
    }
  }

  @OnEvent(RESTAURANT_STATS_SYNCED_EVENT)
  async handleRestaurantStatsSynchronized(
    event: RestaurantStatsSynchronizedEvent,
  ): Promise<void> {
    await this.scheduleFromLatestCycle(
      event.restaurantId,
      event.latestCycleStartedAt,
      'synchronization-success',
    );
  }

  async scheduleFromLatestCycle(
    restaurantId: number,
    latestCycleStartedAt: Date,
    reason: 'bootstrap' | 'synchronization-success',
  ): Promise<void> {
    const cycleStartedAt = this.getNextRelevantCycleStart(
      latestCycleStartedAt,
      new Date(),
    );
    await this.scheduleCycle(restaurantId, cycleStartedAt, reason);
  }

  async scheduleFollowingCycle(
    restaurantId: number,
    cycleStartedAt: Date,
  ): Promise<void> {
    await this.scheduleCycle(
      restaurantId,
      new Date(cycleStartedAt.getTime() + RESTAURANT_CYCLE_DURATION_MS),
      'terminal-failure',
    );
  }

  private async scheduleCycle(
    restaurantId: number,
    cycleStartedAt: Date,
    reason: 'bootstrap' | 'synchronization-success' | 'terminal-failure',
  ): Promise<void> {
    const scheduledAt = new Date(
      cycleStartedAt.getTime() + RESTAURANT_SYNC_OFFSET_MS,
    );
    const jobId = this.getJobId(restaurantId, cycleStartedAt);
    const existingJob = await this.restaurantSyncQueue.getJob(jobId);
    const metadata = {
      restaurantId,
      cycleStartedAt: cycleStartedAt.toISOString(),
      scheduledAt: scheduledAt.toISOString(),
      jobId,
      reason,
    };

    if (existingJob) {
      this.log(
        'debug',
        'Restaurant synchronization task already scheduled',
        metadata,
      );
      return;
    }

    const delay = Math.max(0, scheduledAt.getTime() - Date.now());
    await this.restaurantSyncQueue.add(
      RESTAURANT_SYNC_JOB,
      {
        restaurantId,
        cycleStartedAt: cycleStartedAt.toISOString(),
        scheduledAt: scheduledAt.toISOString(),
      },
      {
        jobId,
        delay,
        attempts: RESTAURANT_SYNC_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: RESTAURANT_SYNC_RETRY_DELAY_MS,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
    this.log('log', 'Restaurant synchronization task scheduled', {
      ...metadata,
      delayMs: delay,
    });
  }

  private async getLatestCycles(): Promise<LatestCycleRow[]> {
    return this.restaurantStatRepository
      .createQueryBuilder('restaurantStat')
      .select('restaurantStat.restaurantId', 'restaurantId')
      .addSelect('MAX(restaurantStat.datetime)', 'latestCycleStartedAt')
      .groupBy('restaurantStat.restaurantId')
      .getRawMany<LatestCycleRow>();
  }

  private getNextRelevantCycleStart(
    latestCycleStartedAt: Date,
    now: Date,
  ): Date {
    const firstFollowingCycle = new Date(
      latestCycleStartedAt.getTime() + RESTAURANT_CYCLE_DURATION_MS,
    );
    const firstFollowingRunAt =
      firstFollowingCycle.getTime() + RESTAURANT_SYNC_OFFSET_MS;
    if (firstFollowingRunAt > now.getTime()) return firstFollowingCycle;

    const elapsedCycles = Math.floor(
      (now.getTime() - firstFollowingRunAt) / RESTAURANT_CYCLE_DURATION_MS,
    );
    return new Date(
      firstFollowingCycle.getTime() +
        elapsedCycles * RESTAURANT_CYCLE_DURATION_MS,
    );
  }

  private getJobId(restaurantId: number, cycleStartedAt: Date): string {
    return `restaurant-sync-${restaurantId}-${cycleStartedAt.getTime()}`;
  }

  private log(
    level: 'log' | 'debug' | 'error',
    message: string,
    metadata: Record<string, unknown>,
    error?: unknown,
  ): void {
    const context = {
      requestId: this.loggingService.generateRequestId(),
      timestamp: new Date(),
    };
    if (level === 'log') this.loggingService.log(message, context, metadata);
    else if (level === 'debug')
      this.loggingService.debug(message, context, metadata);
    else this.loggingService.error(message, context, error, metadata);
  }
}
