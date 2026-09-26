import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Agent } from 'https';

import { SimCompaniesSession } from './entities/simcompanies-session.entity';
import { SimCompaniesSessionService } from './services/simcompanies-session.service';
import { SimCompaniesClient } from './services/simcompanies-client.service';
import { SimCompaniesAuthController } from './controllers/simcompanies-auth.controller';

const simCompaniesHttpsAgent = new Agent({
  family: 4,
  keepAlive: true,
});

@Module({
  imports: [
    TypeOrmModule.forFeature([SimCompaniesSession]),
    HttpModule.register({
      timeout: 15_000,
      httpsAgent: simCompaniesHttpsAgent,
    }),
  ],
  providers: [SimCompaniesSessionService, SimCompaniesClient],
  controllers: [SimCompaniesAuthController],
  exports: [SimCompaniesClient, SimCompaniesSessionService],
})
export class SimCompaniesAuthModule {}
