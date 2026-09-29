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
  RestaurantStatsQueryDto,
  RestaurantStatsSyncAllResponseDto,
  RestaurantStatsSyncResponseDto,
} from '../dtos/restaurant-stat.dto';
import { RestaurantStatsService } from '../services/restaurant-stats.service';

@ApiTags('restaurant-stats')
@ApiBearerAuth()
@Controller('restaurant-stats')
@UseGuards(StaffJwtAuthGuard, PermissionsGuard)
export class RestaurantStatsController {
  constructor(
    private readonly restaurantStatsService: RestaurantStatsService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.RESTAURANT_STATS.READ)
  getRestaurantStats(@Query() query: RestaurantStatsQueryDto) {
    return this.restaurantStatsService.getRestaurantStats(query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.RESTAURANT_STATS.READ)
  getRestaurantStatById(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantStatsService.getRestaurantStatById(id);
  }

  @Post('sync/:buildingId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.RESTAURANT_STATS.SYNC)
  @ApiOperation({
    summary: 'Synchronize a restaurant run history from SimCompanies',
  })
  @ApiOkResponse({ type: RestaurantStatsSyncResponseDto })
  syncRestaurantRuns(@Param('buildingId', ParseIntPipe) buildingId: number) {
    return this.restaurantStatsService.syncRestaurantRuns(buildingId);
  }

  @Post('sync-all')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.RESTAURANT_STATS.SYNC)
  @ApiOperation({
    summary: 'Synchronize all restaurant run histories from SimCompanies',
  })
  @ApiOkResponse({ type: RestaurantStatsSyncAllResponseDto })
  syncAllRestaurantRuns() {
    return this.restaurantStatsService.syncAllRestaurantRuns();
  }
}
