import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SimCompaniesAuthModule } from '@features/auth/auth.module';
import { BuildingEntity } from '@features/building/entities/building.entity';
import { LogsModule } from '@core/logs/logs.module';
import { RestaurantStatsController } from './controllers/restaurant-stats.controller';
import { RestaurantStatEntity } from './entities/restaurant-stat.entity';
import { RestaurantStatsService } from './services/restaurant-stats.service';
import { RESTAURANT_SYNC_QUEUE } from './queues/restaurant-sync.constants';
import { RestaurantSyncProcessor } from './queues/restaurant-sync.processor';
import { RestaurantSyncScheduler } from './queues/restaurant-sync.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([RestaurantStatEntity, BuildingEntity]),
    SimCompaniesAuthModule,
    LogsModule,
    BullModule.registerQueue({ name: RESTAURANT_SYNC_QUEUE }),
  ],
  controllers: [RestaurantStatsController],
  providers: [
    RestaurantStatsService,
    RestaurantSyncScheduler,
    RestaurantSyncProcessor,
  ],
  exports: [RestaurantStatsService],
})
export class RestaurantStatsModule {}
