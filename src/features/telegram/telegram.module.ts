import { Module } from '@nestjs/common';

import { RestaurantInsightsModule } from '@features/restaurant-insights/restaurant-insights.module';
import { TelegramBotService } from './telegram-bot.service';

@Module({
  imports: [RestaurantInsightsModule],
  providers: [TelegramBotService],
})
export class TelegramModule {}
