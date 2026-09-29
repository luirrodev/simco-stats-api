export const TELEGRAM_NOTIFICATION_QUEUE = 'telegram-notifications';
export const TELEGRAM_NOTIFICATION_JOB = 'send-notification';
export const TELEGRAM_NOTIFICATION_RETRY_DELAY_MS = 5 * 60 * 1000;
export const TELEGRAM_NOTIFICATION_MAX_ATTEMPTS = 2_147_483_647;

export interface TelegramNotificationJobData {
  recipientId: number;
  message: string;
}
