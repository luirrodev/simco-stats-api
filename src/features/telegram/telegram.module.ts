import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

import { RestaurantInsightsModule } from '@features/restaurant-insights/restaurant-insights.module';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramNotificationProcessor } from './telegram-notification.processor';
import { TELEGRAM_NOTIFICATION_QUEUE } from './telegram-notification.constants';

@Module({
  imports: [
    RestaurantInsightsModule,
    BullModule.registerQueue({ name: TELEGRAM_NOTIFICATION_QUEUE }),
  ],
  providers: [TelegramBotService, TelegramNotificationProcessor],
  exports: [TelegramBotService],
})
export class TelegramModule {}
