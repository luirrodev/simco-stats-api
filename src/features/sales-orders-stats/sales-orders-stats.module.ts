import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SaleOrderEntity } from './entities/sale-order.entity';
import { SaleOrdersService } from './services/sale-orders.service';
import { SaleOrdersSchedulerService } from './services/sale-orders-scheduler.service';
import { SaleOrdersController } from './controllers/sale-orders.controller';
import { SimCompaniesAuthModule } from '../auth/auth.module';
import { BuildingModule } from '../building/building.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SaleOrderEntity]),
    SimCompaniesAuthModule,
    BuildingModule,
    forwardRef(() => QueueModule),
  ],
  controllers: [SaleOrdersController],
  providers: [SaleOrdersService, SaleOrdersSchedulerService],
  exports: [SaleOrdersService, SaleOrdersSchedulerService],
})
export class SalesOrdersStatsModule {}
