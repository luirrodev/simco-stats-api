import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AuthModule } from '../auth/auth.module';
import { RestaurantStatEntity } from './entities/restaurant-stat.entity';
import { RestaurantStatsService } from './services/restaurant-stats.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RestaurantStatEntity]),
    HttpModule,
    AuthModule,
  ],
  controllers: [],
  providers: [RestaurantStatsService],
  exports: [TypeOrmModule, RestaurantStatsService],
})
export class RestaurantStatsModule {}
