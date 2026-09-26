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

import { User } from '../entities/user.entity';
import { UsersService } from '../services/users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
} from '../dtos/user.dto';
import { PaginationDto, PaginatedResponse } from '@common/dto/pagination.dto';

import { PermissionsGuard } from '../../permissions/guards/permissions.guard';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../permissions/constants/permissions.constant';

@ApiTags('users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '2' })
@UseGuards(PermissionsGuard)
export class UsersV2Controller {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USERS.READ)
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    return this.usersService.findAll(paginationDto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USERS.READ)
  async findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findOne(+id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USERS.CREATE)
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.USERS.UPDATE)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.USERS.DELETE)
  async remove(@Param('id') id: string): Promise<void> {
    await this.usersService.remove(+id);
  }
}
