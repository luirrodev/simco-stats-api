import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { PermissionsService } from '../services/permissions.service';
import { UpdatePermissionDto } from '../dtos/permission.dto';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../constants/permissions.constant';

import { PermissionsGuard } from '../guards/permissions.guard';
import { PaginationDto } from '@common/dto/pagination.dto';
import { StaffJwtAuthGuard } from '@core/auth/guards/staff-jwt-auth.guard';

@ApiTags('permissions')
@ApiBearerAuth()
@Controller({ path: 'permissions', version: '2' })
@UseGuards(StaffJwtAuthGuard, PermissionsGuard)
export class PermissionsV2Controller {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PERMISSIONS.READ)
  async getAllPermissions(@Query() paginationDto: PaginationDto) {
    return this.permissionsService.getAllPermissions(paginationDto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PERMISSIONS.READ)
  async getPermissionById(@Param('id', ParseIntPipe) id: number) {
    return this.permissionsService.getPermissionById(id);
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.PERMISSIONS.WRITE)
  async updatePermission(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdatePermissionDto,
  ) {
    return this.permissionsService.updatePermission(id, data);
  }
}
