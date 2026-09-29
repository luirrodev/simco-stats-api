import { Module } from '@nestjs/common';

import { BuildingModule } from '@features/building/building.module';
import { RestaurantStatsModule } from '@features/restaurant-stats/restaurant-stats.module';
import { TelegramBotService } from './telegram-bot.service';

@Module({
  imports: [BuildingModule, RestaurantStatsModule],
  providers: [TelegramBotService],
})
export class TelegramModule {}
