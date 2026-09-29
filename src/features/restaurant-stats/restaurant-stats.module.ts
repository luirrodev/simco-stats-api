import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SimCompaniesAuthModule } from '@features/auth/auth.module';
import { BuildingEntity } from '@features/building/entities/building.entity';
import { RestaurantStatsController } from './controllers/restaurant-stats.controller';
import { RestaurantStatEntity } from './entities/restaurant-stat.entity';
import { RestaurantStatsService } from './services/restaurant-stats.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RestaurantStatEntity, BuildingEntity]),
    SimCompaniesAuthModule,
  ],
  controllers: [RestaurantStatsController],
  providers: [RestaurantStatsService],
  exports: [RestaurantStatsService],
})
export class RestaurantStatsModule {}
