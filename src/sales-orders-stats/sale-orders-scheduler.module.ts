import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleOrdersSchedulerService } from './services/sale-orders-scheduler.service';
import { SaleOrderEntity } from './entities/sale-order.entity';
import { QueueModule } from 'src/queue/queue.module';
import { SaleOrdersProcessor } from 'src/queue/processors/sale-orders.processor';
import { SaleOrdersService } from './services/sale-orders.service';
import { BuildingModule } from 'src/building/building.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SaleOrderEntity]),
    QueueModule,
    BuildingModule,
  ],
  providers: [
    SaleOrdersSchedulerService,
    SaleOrdersProcessor,
    SaleOrdersService,
  ],
  exports: [SaleOrdersSchedulerService],
})
export class SaleOrdersSchedulerModule {}
