import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  ParseIntPipe,
  Delete,
  Put,
  Patch,
  Query,
} from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { RolesService } from '../services/roles.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  UpdateRolePermissionDto,
} from '../dtos/role.dto';
import { PaginationDto } from '@common/dto/pagination.dto';
import { PermissionsGuard } from '../../permissions/guards/permissions.guard';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../permissions/constants/permissions.constant';
import { StaffJwtAuthGuard } from '@core/auth/guards/staff-jwt-auth.guard';

@ApiTags('roles')
@ApiBearerAuth()
@Controller({ path: 'roles', version: '2' })
@UseGuards(StaffJwtAuthGuard, PermissionsGuard)
export class RolesV2Controller {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ROLES.READ)
  getAllRoles(@Query() paginationDto: PaginationDto) {
    return this.rolesService.getAllRoles(paginationDto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ROLES.READ)
  getRoleById(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.getRoleById(id, false);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ROLES.CREATE)
  createRole(@Body() payload: CreateRoleDto) {
    return this.rolesService.createRole(payload);
  }

  @Patch(':id/permissions/:permissionId')
  @RequirePermissions(PERMISSIONS.ROLES.UPDATE)
  togglePermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
    @Body() payload: UpdateRolePermissionDto,
  ) {
    return this.rolesService.togglePermission(id, permissionId, payload);
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.ROLES.UPDATE)
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateRoleDto,
  ) {
    return this.rolesService.updateRole(id, payload);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.ROLES.DELETE)
  deleteRole(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.deleteRole(id);
  }
}
