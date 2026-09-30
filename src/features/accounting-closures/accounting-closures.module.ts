import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BuildingEntity } from '@features/building/entities/building.entity';
import { RestaurantStatEntity } from '@features/restaurant-stats/entities/restaurant-stat.entity';
import { ACCOUNTING_CLOSURE_QUEUE } from './accounting-closure.constants';
import { AccountingClosureEntity } from './entities/accounting-closure.entity';
import { AccountingClosureProcessor } from './queues/accounting-closure.processor';
import { AccountingClosureScheduler } from './queues/accounting-closure.scheduler';
import { AccountingClosureService } from './services/accounting-closure.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountingClosureEntity,
      BuildingEntity,
      RestaurantStatEntity,
    ]),
    BullModule.registerQueue({ name: ACCOUNTING_CLOSURE_QUEUE }),
  ],
  providers: [
    AccountingClosureService,
    AccountingClosureScheduler,
    AccountingClosureProcessor,
  ],
  exports: [AccountingClosureService],
})
export class AccountingClosuresModule {}
