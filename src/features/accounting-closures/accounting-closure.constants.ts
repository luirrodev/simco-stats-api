export const ACCOUNTING_CLOSURE_QUEUE = 'accounting-closures';
export const ACCOUNTING_CLOSURE_JOB = 'create-accounting-closure';
export const ACCOUNTING_CLOSURE_CORRECTION_JOB = 'correct-accounting-closure';
export const ACCOUNTING_CLOSURE_COMPLETED_EVENT =
  'accounting-closure.completed';
export const ACCOUNTING_CLOSURE_CORRECTED_EVENT =
  'accounting-closure.corrected';
export const ACCOUNTING_CLOSURE_TIMEZONE = 'America/Havana';
export const RESTAURANT_CYCLE_DURATION_MS = 12 * 60 * 60 * 1000;

export interface AccountingClosureJobData {
  periodEnd?: string;
  closureId?: number;
}

export interface AccountingClosureCompletedEvent {
  closureId: number;
  periodStart: Date;
  periodEnd: Date;
  operatingRestaurantCount: number;
  operatingLevelCount: number;
  totalProfit: number;
  pphl: number;
  excludedRestaurantCount: number;
}

export interface AccountingClosureCorrectedEvent
  extends AccountingClosureCompletedEvent {
  addedRunCount: number;
  profitDelta: number;
  pphlDelta: number;
}
