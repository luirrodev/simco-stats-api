import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { SaleOrdersProcessor } from './processors/sale-orders.processor';

import { SalesOrdersStatsModule } from '../sales-orders-stats/sales-orders-stats.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'sale-orders-sync',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 60000 },
      },
    }),
    forwardRef(() => SalesOrdersStatsModule),
  ],
  controllers: [QueueController],
  providers: [QueueService, SaleOrdersProcessor],
  exports: [BullModule, QueueService],
})
export class QueueModule {}
