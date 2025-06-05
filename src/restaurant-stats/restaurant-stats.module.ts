import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantStatEntity } from './entities/restaurant-stat.entity';
import { RestaurantStatsService } from './services/restaurant-stats.service';

@Module({
  imports: [TypeOrmModule.forFeature([RestaurantStatEntity])],
  controllers: [],
  providers: [RestaurantStatsService],
  exports: [TypeOrmModule, RestaurantStatsService],
})
export class RestaurantStatsModule {}
