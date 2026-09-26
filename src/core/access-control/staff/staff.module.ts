import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../users/entities/user.entity';
import { Staff } from './entities/staff.entity';

import { StaffV2Controller } from './controllers/staff-v2.controller';
import { StaffService } from './services/staff.service';

import { AuthModule } from '@core/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Staff]), AuthModule],
  controllers: [StaffV2Controller],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
