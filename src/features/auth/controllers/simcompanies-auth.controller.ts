import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '@core/access-control/permissions/constants/permissions.constant';
import { PermissionsGuard } from '@core/access-control/permissions/guards/permissions.guard';
import { StaffJwtAuthGuard } from '@core/auth/guards/staff-jwt-auth.guard';
import { SimCompaniesSessionService } from '../services/simcompanies-session.service';
import { SimCompaniesLoginResponseDto } from '../dtos/simcompanies-login-response.dto';

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

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.SIMCOMPANIES.READ)
  @ApiOperation({ summary: 'Force a new SimCompanies server session' })
  @ApiOkResponse({ type: SimCompaniesLoginResponseDto })
  login(): Promise<SimCompaniesLoginResponseDto> {
    return this.sessionService.forceLogin();
  }
}
