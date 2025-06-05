import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { AuthModule } from '../auth/auth.module';
import { RestaurantStatEntity } from './entities/restaurant-stat.entity';
import { BuildingEntity } from './entities/building.entity';
import { RestaurantStatsService } from './services/restaurant-stats.service';
import { BuildingService } from './services/building.service';
import { RestaurantStatsController } from './controllers/restaurant-stats.controller';
import { BuildingController } from './controllers/building.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([RestaurantStatEntity, BuildingEntity]),
    HttpModule,
    AuthModule,
  ],
  controllers: [RestaurantStatsController, BuildingController],
  providers: [RestaurantStatsService, BuildingService],
  exports: [TypeOrmModule, RestaurantStatsService, BuildingService],
})
export class RestaurantStatsModule {}
