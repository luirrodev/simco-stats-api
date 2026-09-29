import { Injectable } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type bull from 'bull';

import { LoggingService } from '@core/logs/services/logging.service';
import { RestaurantStatsService } from '../services/restaurant-stats.service';
import {
  RESTAURANT_SYNC_ATTEMPTS,
  RESTAURANT_SYNC_COMPLETED_EVENT,
  RESTAURANT_SYNC_FAILED_EVENT,
  RESTAURANT_SYNC_JOB,
  RESTAURANT_SYNC_QUEUE,
} from './restaurant-sync.constants';
import type {
  RestaurantSyncCompletedEvent,
  RestaurantSyncFailedEvent,
  RestaurantSyncJobData,
} from './restaurant-sync.constants';
import { RestaurantSyncScheduler } from './restaurant-sync.scheduler';

@Processor(RESTAURANT_SYNC_QUEUE)
@Injectable()
export class RestaurantSyncProcessor {
  constructor(
    private readonly restaurantStatsService: RestaurantStatsService,
    private readonly restaurantSyncScheduler: RestaurantSyncScheduler,
    private readonly loggingService: LoggingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Process({ name: RESTAURANT_SYNC_JOB, concurrency: 1 })
  async processRestaurantSync(
    job: bull.Job<RestaurantSyncJobData>,
  ): Promise<void> {
    const attempt = job.attemptsMade + 1;
    const metadata = this.getMetadata(job, attempt);
    this.log('log', 'Restaurant synchronization task started', metadata);

    try {
      const result = await this.restaurantStatsService.syncRestaurantRuns(
        job.data.restaurantId,
      );
      this.log('log', 'Restaurant synchronization task completed', {
        ...metadata,
        created: result.created,
        updated: result.updated,
        total: result.total,
      });
      const event: RestaurantSyncCompletedEvent = {
        restaurantId: job.data.restaurantId,
        cycleStartedAt: job.data.cycleStartedAt,
      };
      this.eventEmitter.emit(RESTAURANT_SYNC_COMPLETED_EVENT, event);
    } catch (error) {
      if (attempt >= RESTAURANT_SYNC_ATTEMPTS) {
        this.log(
          'error',
          'Restaurant synchronization task exhausted all attempts',
          metadata,
          error,
        );
        await this.restaurantSyncScheduler.scheduleFollowingCycle(
          job.data.restaurantId,
          new Date(job.data.cycleStartedAt),
        );
        const event: RestaurantSyncFailedEvent = {
          restaurantId: job.data.restaurantId,
          cycleStartedAt: job.data.cycleStartedAt,
          attempts: RESTAURANT_SYNC_ATTEMPTS,
          errorMessage: this.getErrorMessage(error),
        };
        this.eventEmitter.emit(RESTAURANT_SYNC_FAILED_EVENT, event);
      } else {
        this.log(
          'warn',
          'Restaurant synchronization task failed and will retry',
          {
            ...metadata,
            nextAttempt: attempt + 1,
            errorMessage: this.getErrorMessage(error),
          },
          error,
        );
      }
      throw error;
    }
  }

  private getMetadata(
    job: bull.Job<RestaurantSyncJobData>,
    attempt: number,
  ): Record<string, unknown> {
    return {
      restaurantId: job.data.restaurantId,
      cycleStartedAt: job.data.cycleStartedAt,
      scheduledAt: job.data.scheduledAt,
      jobId: job.id,
      attempt,
      maxAttempts: RESTAURANT_SYNC_ATTEMPTS,
    };
  }

  private log(
    level: 'log' | 'warn' | 'error',
    message: string,
    metadata: Record<string, unknown>,
    error?: unknown,
  ): void {
    const context = {
      requestId: this.loggingService.generateRequestId(),
      timestamp: new Date(),
    };
    if (level === 'log') this.loggingService.log(message, context, metadata);
    else if (level === 'warn')
      this.loggingService.warn(message, context, metadata);
    else this.loggingService.error(message, context, error, metadata);
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
