import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
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
import {
  BuildingResponseDto,
  BuildingsQueryDto,
  BuildingsSyncResponseDto,
} from '../dtos/building.dto';
import { BuildingService } from '../services/building.service';

@ApiTags('buildings')
@ApiBearerAuth()
@Controller('buildings')
@UseGuards(StaffJwtAuthGuard, PermissionsGuard)
export class BuildingController {
  constructor(private readonly buildingService: BuildingService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.BUILDINGS.READ)
  @ApiOperation({ summary: 'List synchronized restaurant buildings' })
  public getAllBuildings(@Query() query: BuildingsQueryDto) {
    return this.buildingService.getAllBuildings(query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.BUILDINGS.READ)
  @ApiOkResponse({ type: BuildingResponseDto })
  public getBuildingById(@Param('id', ParseIntPipe) id: number) {
    return this.buildingService.getBuildingById(id);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.BUILDINGS.SYNC)
  @ApiOperation({
    summary: 'Synchronize restaurant buildings from SimCompanies',
  })
  @ApiOkResponse({ type: BuildingsSyncResponseDto })
  public syncBuildingsFromApi() {
    return this.buildingService.syncBuildingsFromApi();
  }
}
