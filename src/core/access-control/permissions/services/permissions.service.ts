import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsOrder, Like, Repository } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { UpdatePermissionDto } from '../dtos/permission.dto';
import { PaginationDto, PaginatedResponse } from '@common/dto/pagination.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepo: Repository<Permission>,
  ) {}

  async getAllPermissions(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<Permission>> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'id',
      sortDir = 'ASC',
    } = paginationDto;
    const skip = (page - 1) * limit;

    const whereOptions: Record<string, any>[] = [];

    if (search) {
      whereOptions.push(
        { name: Like(`%${search}%`) },
        { description: Like(`%${search}%`) },
      );
    }

    const order: FindOptionsOrder<Permission> = {
      [sortBy]: sortDir,
    };

    const [permissions, total] = await this.permissionRepo.findAndCount({
      where: whereOptions.length > 0 ? whereOptions : undefined,
      skip,
      take: limit,
      order,
    });

    const totalPages = Math.ceil(total / limit);
    const response: PaginatedResponse<Permission> = {
      data: permissions,
      page,
      limit,
      total,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
    };
    return response;
  }

  async getPermissionById(id: number) {
    const permission = await this.permissionRepo.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!permission) {
      throw new Error('Permiso no encontrado');
    }

    return permission;
  }

  async updatePermission(id: number, data: UpdatePermissionDto) {
    const permission = await this.getPermissionById(id);
    permission.description = data.description;
    const updated = await this.permissionRepo.save(permission);

    return updated;
  }
}
