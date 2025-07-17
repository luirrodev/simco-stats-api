import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { SaleOrderEntity } from './entities/sale-order.entity';
import { SaleOrdersService } from './services/sale-orders.service';
import { SaleOrdersController } from './controllers/sale-orders.controller';
import { AuthModule } from '../auth/auth.module';
import { BuildingModule } from 'src/building/building.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SaleOrderEntity]),
    HttpModule,
    AuthModule,
    BuildingModule,
  ],
  controllers: [SaleOrdersController],
  providers: [SaleOrdersService],
  exports: [SaleOrdersService],
})
export class SalesOrdersStatsModule {}
