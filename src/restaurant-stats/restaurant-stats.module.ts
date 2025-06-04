import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantStatEntity } from './entities/restaurant-stat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RestaurantStatEntity])],
  exports: [TypeOrmModule],
})
export class RestaurantStatsModule {}
