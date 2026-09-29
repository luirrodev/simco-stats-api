import { Injectable, Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import type bull from 'bull';

import { TelegramBotService } from './telegram-bot.service';
import {
  TELEGRAM_NOTIFICATION_JOB,
  TELEGRAM_NOTIFICATION_QUEUE,
} from './telegram-notification.constants';
import type { TelegramNotificationJobData } from './telegram-notification.constants';

@Processor(TELEGRAM_NOTIFICATION_QUEUE)
@Injectable()
export class TelegramNotificationProcessor {
  private readonly logger = new Logger(TelegramNotificationProcessor.name);

  constructor(private readonly telegramBotService: TelegramBotService) {}

  @Process({ name: TELEGRAM_NOTIFICATION_JOB, concurrency: 1 })
  async processNotification(
    job: bull.Job<TelegramNotificationJobData>,
  ): Promise<void> {
    try {
      await this.telegramBotService.sendProactiveMessage(
        job.data.recipientId,
        job.data.message,
      );
    } catch (error) {
      this.logger.warn(
        `Unable to deliver Telegram notification to user ${job.data.recipientId}; retrying (attempt ${job.attemptsMade + 1})`,
      );
      throw error;
    }
  }
}
