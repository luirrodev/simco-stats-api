import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { SimCompaniesSession } from './entities/simcompanies-session.entity';
import { SimCompaniesSessionService } from './services/simcompanies-session.service';
import { SimCompaniesClient } from './services/simcompanies-client.service';
import { SimCompaniesAuthController } from './controllers/simcompanies-auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SimCompaniesSession]),
    HttpModule,
  ],
  providers: [SimCompaniesSessionService, SimCompaniesClient],
  controllers: [SimCompaniesAuthController],
  exports: [SimCompaniesClient, SimCompaniesSessionService],
})
export class SimCompaniesAuthModule {}
