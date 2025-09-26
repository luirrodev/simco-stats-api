import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import Redis from 'ioredis';

import { QueueService } from './queue.service';

import config from 'src/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [config.KEY],
      useFactory: (configService: ConfigType<typeof config>) => {
        const redisUrl = configService.redis.url as string;

        const client = new Redis(redisUrl, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          tls: { rejectUnauthorized: false },
        });

        return {
          createClient: () => client,
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
  ],
  providers: [QueueService],
  exports: [BullModule, QueueService],
})
export class QueueModule {}
