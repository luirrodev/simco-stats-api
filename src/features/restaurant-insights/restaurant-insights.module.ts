import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BuildingEntity } from '@features/building/entities/building.entity';
import { RestaurantStatEntity } from '@features/restaurant-stats/entities/restaurant-stat.entity';
import { RestaurantInsightsService } from './services/restaurant-insights.service';

@Module({
  imports: [TypeOrmModule.forFeature([BuildingEntity, RestaurantStatEntity])],
  providers: [RestaurantInsightsService],
  exports: [RestaurantInsightsService],
})
export class RestaurantInsightsModule {}
