import { Module, forwardRef } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { SaleOrdersProcessor } from './processors/sale-orders.processor';

import config from 'src/config';
import { SalesOrdersStatsModule } from 'src/sales-orders-stats/sales-orders-stats.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [config.KEY],
      useFactory: (configService: ConfigType<typeof config>) => {
        const redisUrl = configService.redis.url as string;

        return {
          redis: redisUrl,
          defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 60000,
            },
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: 'sale-orders-sync',
    }),
    forwardRef(() => SalesOrdersStatsModule),
  ],
  controllers: [QueueController],
  providers: [QueueService, SaleOrdersProcessor],
  exports: [BullModule, QueueService],
})
export class QueueModule {}
