import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { SaleOrderEntity } from './entities/sale-order.entity';
import { SaleOrdersService } from './services/sale-orders.service';
import { SaleOrdersSchedulerService } from './services/sale-orders-scheduler.service';
import { SaleOrdersController } from './controllers/sale-orders.controller';
import { AuthModule } from '../auth/auth.module';
import { BuildingModule } from 'src/building/building.module';
import { QueueModule } from 'src/queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SaleOrderEntity]),
    HttpModule,
    AuthModule,
    BuildingModule,
    forwardRef(() => QueueModule),
  ],
  controllers: [SaleOrdersController],
  providers: [SaleOrdersService, SaleOrdersSchedulerService],
  exports: [SaleOrdersService, SaleOrdersSchedulerService],
})
export class SalesOrdersStatsModule {}
