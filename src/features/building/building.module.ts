import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SimCompaniesAuthModule } from '@features/auth/auth.module';
import { BuildingController } from './controllers/building.controller';
import { BuildingEntity } from './entities/building.entity';
import { BuildingService } from './services/building.service';

@Module({
  imports: [TypeOrmModule.forFeature([BuildingEntity]), SimCompaniesAuthModule],
  controllers: [BuildingController],
  providers: [BuildingService],
  exports: [BuildingService],
})
export class BuildingModule {}
