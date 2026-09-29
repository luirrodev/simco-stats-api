export const RESTAURANT_SYNC_QUEUE = 'restaurant-sync';
export const RESTAURANT_SYNC_JOB = 'sync-restaurant';
export const RESTAURANT_STATS_SYNCED_EVENT = 'restaurant-stats.synchronized';

export const RESTAURANT_CYCLE_DURATION_MS = 12 * 60 * 60 * 1000;
export const RESTAURANT_SYNC_OFFSET_MS = 5 * 60 * 1000;
export const RESTAURANT_SYNC_ATTEMPTS = 5;
export const RESTAURANT_SYNC_RETRY_DELAY_MS = 60 * 1000;

export interface RestaurantSyncJobData {
  restaurantId: number;
  cycleStartedAt: string;
  scheduledAt: string;
}

export interface RestaurantStatsSynchronizedEvent {
  restaurantId: number;
  latestCycleStartedAt: Date;
}
