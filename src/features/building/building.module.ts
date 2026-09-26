import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BuildingEntity } from './entities/building.entity';
import { BuildingService } from './services/building.service';
import { BuildingController } from './controllers/building.controller';
import { SimCompaniesAuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([BuildingEntity]), SimCompaniesAuthModule],
  controllers: [BuildingController],
  providers: [BuildingService],
  exports: [TypeOrmModule, BuildingService],
})
export class BuildingModule {}
