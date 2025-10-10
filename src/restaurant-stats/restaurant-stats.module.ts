import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { AuthModule } from '../auth/auth.module';
import { RestaurantStatEntity } from './entities/restaurant-stat.entity';
import { RestaurantStatsService } from './services/restaurant-stats.service';
// import { RestaurantStatsController } from './controllers/restaurant-stats.controller';
import { BuildingModule } from 'src/building/building.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RestaurantStatEntity]),
    HttpModule,
    AuthModule,
    BuildingModule,
  ],
  // controllers: [RestaurantStatsController],
  providers: [RestaurantStatsService],
  exports: [TypeOrmModule, RestaurantStatsService],
})
export class RestaurantStatsModule {}
