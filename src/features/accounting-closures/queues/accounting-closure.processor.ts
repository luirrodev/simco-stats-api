import { Injectable } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type bull from 'bull';

import {
  ACCOUNTING_CLOSURE_COMPLETED_EVENT,
  ACCOUNTING_CLOSURE_CORRECTED_EVENT,
  ACCOUNTING_CLOSURE_CORRECTION_JOB,
  ACCOUNTING_CLOSURE_JOB,
  ACCOUNTING_CLOSURE_QUEUE,
} from '../accounting-closure.constants';
import type { AccountingClosureJobData } from '../accounting-closure.constants';
import {
  AccountingClosureService,
  getAccountingPeriodForEnd,
} from '../services/accounting-closure.service';

@Processor(ACCOUNTING_CLOSURE_QUEUE)
@Injectable()
export class AccountingClosureProcessor {
  constructor(
    private readonly closureService: AccountingClosureService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Process({ name: ACCOUNTING_CLOSURE_JOB, concurrency: 1 })
  async process(job: bull.Job<AccountingClosureJobData>): Promise<void> {
    const result = await this.closureService.createForPeriod(
      getAccountingPeriodForEnd(this.getPeriodEnd(job)),
    );
    if (result.created) {
      const closure = result.closure;
      this.eventEmitter.emit(ACCOUNTING_CLOSURE_COMPLETED_EVENT, {
        closureId: closure.id,
        periodStart: closure.periodStart,
        periodEnd: closure.periodEnd,
        operatingRestaurantCount: closure.operatingRestaurantCount,
        operatingLevelCount: closure.operatingLevelCount,
        totalProfit: closure.totalProfit,
        pphl: closure.pphl,
        excludedRestaurantCount: closure.excludedRestaurantCount,
      });
    }
  }

  @Process({ name: ACCOUNTING_CLOSURE_CORRECTION_JOB, concurrency: 1 })
  async processCorrection(job: bull.Job<AccountingClosureJobData>): Promise<void> {
    if (!job.data.closureId) return;
    const result = await this.closureService.correctClosure(job.data.closureId);
    if (!result) return;
    const closure = result.closure;
    this.eventEmitter.emit(ACCOUNTING_CLOSURE_CORRECTED_EVENT, {
      closureId: closure.id,
      periodStart: closure.periodStart,
      periodEnd: closure.periodEnd,
      operatingRestaurantCount: closure.operatingRestaurantCount,
      operatingLevelCount: closure.operatingLevelCount,
      totalProfit: closure.totalProfit,
      pphl: closure.pphl,
      excludedRestaurantCount: closure.excludedRestaurantCount,
      addedRunCount: result.addedRunCount,
      profitDelta: result.profitDelta,
      pphlDelta: result.pphlDelta,
    });
  }

  private getPeriodEnd(job: bull.Job<AccountingClosureJobData>): Date {
    if (job.data.periodEnd) return new Date(job.data.periodEnd);
    const scheduledAt = (job.opts as bull.JobOptions & { prevMillis?: number })
      .prevMillis;
    return new Date(scheduledAt ?? job.timestamp);
  }
}
