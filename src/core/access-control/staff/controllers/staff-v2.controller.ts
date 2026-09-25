import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { StaffService } from '../services/staff.service';
import {
  CreateStaffDto,
  UpdateStaffDto,
  StaffResponseDto,
} from '../dto/staff.dto';
import { PaginationDto, PaginatedResponse } from '@common/dto/pagination.dto';

import { PermissionsGuard } from '../../permissions/guards/permissions.guard';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../permissions/constants/permissions.constant';
import { StaffJwtAuthGuard } from '@core/auth/guards/staff-jwt-auth.guard';

@ApiTags('staff')
@ApiBearerAuth()
@Controller({ path: 'staff', version: '2' })
@UseGuards(StaffJwtAuthGuard, PermissionsGuard)
export class StaffV2Controller {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.STAFF.READ)
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<StaffResponseDto>> {
    return this.staffService.findAll(paginationDto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.STAFF.READ)
  async findOne(@Param('id') id: string): Promise<StaffResponseDto> {
    return this.staffService.findOne(+id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.STAFF.CREATE)
  async create(
    @Body() createStaffDto: CreateStaffDto,
  ): Promise<StaffResponseDto> {
    return this.staffService.create(createStaffDto);
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.STAFF.UPDATE)
  async update(
    @Param('id') id: string,
    @Body() updateStaffDto: UpdateStaffDto,
  ): Promise<StaffResponseDto> {
    return this.staffService.update(+id, updateStaffDto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.STAFF.DELETE)
  async remove(@Param('id') id: string): Promise<void> {
    await this.staffService.remove(+id);
  }
}
