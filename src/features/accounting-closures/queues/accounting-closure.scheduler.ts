import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { OnEvent } from '@nestjs/event-emitter';
import type { Queue } from 'bull';

import {
  ACCOUNTING_CLOSURE_JOB,
  ACCOUNTING_CLOSURE_CORRECTION_JOB,
  ACCOUNTING_CLOSURE_QUEUE,
  ACCOUNTING_CLOSURE_TIMEZONE,
} from '../accounting-closure.constants';
import type { AccountingClosureJobData } from '../accounting-closure.constants';
import { AccountingClosureService } from '../services/accounting-closure.service';
import { RESTAURANT_STATS_SYNCED_EVENT } from '@features/restaurant-stats/queues/restaurant-sync.constants';
import type { RestaurantStatsSynchronizedEvent } from '@features/restaurant-stats/queues/restaurant-sync.constants';

@Injectable()
export class AccountingClosureScheduler implements OnApplicationBootstrap {
  constructor(
    @InjectQueue(ACCOUNTING_CLOSURE_QUEUE)
    private readonly queue: Queue<AccountingClosureJobData>,
    private readonly closureService: AccountingClosureService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      ACCOUNTING_CLOSURE_JOB,
      {},
      {
        jobId: ACCOUNTING_CLOSURE_JOB,
        repeat: { cron: '0 0,12 * * *', tz: ACCOUNTING_CLOSURE_TIMEZONE },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
    const missingPeriods = await this.closureService.getMissingPeriods(
      new Date(),
    );
    for (const period of missingPeriods) {
      await this.queue.add(
        ACCOUNTING_CLOSURE_JOB,
        { periodEnd: period.end.toISOString() },
        {
          jobId: `${ACCOUNTING_CLOSURE_JOB}-${period.end.getTime()}`,
          attempts: 5,
          backoff: { type: 'exponential', delay: 60 * 1000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }
  }

  @OnEvent(RESTAURANT_STATS_SYNCED_EVENT)
  async scheduleCorrections(
    event: RestaurantStatsSynchronizedEvent,
  ): Promise<void> {
    const closureIds = await this.closureService.getClosuresRequiringCorrection(
      event.restaurantId,
    );
    for (const closureId of closureIds) {
      await this.queue.add(
        ACCOUNTING_CLOSURE_CORRECTION_JOB,
        { closureId },
        {
          jobId: `${ACCOUNTING_CLOSURE_CORRECTION_JOB}-${closureId}`,
          delay: 5 * 60 * 1000,
          attempts: 5,
          backoff: { type: 'exponential', delay: 60 * 1000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }
  }
}
