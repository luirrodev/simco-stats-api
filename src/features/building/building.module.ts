import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { BuildingEntity } from './entities/building.entity';
import { BuildingService } from './services/building.service';
import { BuildingController } from './controllers/building.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([BuildingEntity]), HttpModule, AuthModule],
  controllers: [BuildingController],
  providers: [BuildingService],
  exports: [TypeOrmModule, BuildingService],
})
export class BuildingModule {}
