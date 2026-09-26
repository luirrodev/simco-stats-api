import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '@core/access-control/permissions/constants/permissions.constant';
import { PermissionsGuard } from '@core/access-control/permissions/guards/permissions.guard';
import { StaffJwtAuthGuard } from '@core/auth/guards/staff-jwt-auth.guard';
import { SimCompaniesSessionService } from '../services/simcompanies-session.service';

@ApiTags('simcompanies')
@ApiBearerAuth()
@Controller('auth/simcompanies')
@UseGuards(StaffJwtAuthGuard, PermissionsGuard)
export class SimCompaniesAuthController {
  constructor(private readonly sessionService: SimCompaniesSessionService) {}

  @Get('status')
  @RequirePermissions(PERMISSIONS.SIMCOMPANIES.READ)
  getStatus() {
    return this.sessionService.getStatus();
  }
}
