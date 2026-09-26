import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsOrder, FindOptionsWhere } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { Role } from '../entities/role.entity';
import { PermissionsService } from '../../permissions/services/permissions.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  UpdateRolePermissionDto,
} from '../dtos/role.dto';
import { PaginationDto, PaginatedResponse } from '@common/dto/pagination.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    private readonly permissionsService: PermissionsService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  private getCacheKey(id: number): string {
    return `role:${id}`;
  }

  async createRole(data: CreateRoleDto) {
    const role = this.roleRepo.create(data);
    return this.roleRepo.save(role);
  }

  async getAllRoles(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<Role>> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'id',
      sortDir = 'ASC',
    } = paginationDto;
    const skip = (page - 1) * limit;

    const whereOptions: FindOptionsWhere<Role>[] = [];

    if (search) {
      whereOptions.push(
        { name: Like(`%${search}%`) },
        { description: Like(`%${search}%`) },
      );
    }

    const allowedSortFields = ['id', 'name', 'description', 'version'];
    const order: FindOptionsOrder<Role> = {
      [allowedSortFields.includes(sortBy) ? sortBy : 'id']: sortDir,
    };

    const [roles, total] = await this.roleRepo.findAndCount({
      where: whereOptions.length > 0 ? whereOptions : undefined,
      skip,
      take: limit,
      order,
    });

    const totalPages = Math.ceil(total / limit);
    const response: PaginatedResponse<Role> = {
      data: roles,
      page,
      limit,
      total,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
    };

    return response;
  }

  async getRoleById(id: number, useCache = true): Promise<Role> {
    const cacheKey = this.getCacheKey(id);

    if (useCache) {
      const cachedRole = await this.redis.get(cacheKey);

      if (cachedRole) {
        return JSON.parse(cachedRole) as Role;
      }
    }

    const role = await this.roleRepo.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    if (useCache) {
      await this.redis.set(cacheKey, JSON.stringify(role), 'EX', 3600);
    }

    return role;
  }

  async togglePermission(
    id: number,
    permissionId: number,
    data: UpdateRolePermissionDto,
  ) {
    const role = await this.getRoleById(id);

    const permission =
      await this.permissionsService.getPermissionById(permissionId);

    const hasPermission = role.permissions.some((p) => p.id === permissionId);
    let changed = false;

    if (data.enabled && !hasPermission) {
      role.permissions.push(permission);
      changed = true;
    } else if (!data.enabled && hasPermission) {
      role.permissions = role.permissions.filter((p) => p.id !== permissionId);
      changed = true;
    }

    if (changed) {
      role.version += 1;
      const updatedRole = await this.roleRepo.save(role);
      await this.invalidateRoleCache(id);
      return updatedRole;
    }

    return role;
  }

  async updateRole(id: number, data: UpdateRoleDto) {
    const role = await this.getRoleById(id);
    this.roleRepo.merge(role, data);
    const updatedRole = await this.roleRepo.save(role);

    // Invalidar caché
    await this.invalidateRoleCache(id);

    return updatedRole;
  }

  async deleteRole(id: number) {
    const role = await this.getRoleById(id);

    // Invalidar caché antes de eliminar
    await this.invalidateRoleCache(id);

    return this.roleRepo.remove(role);
  }

  private async invalidateRoleCache(id: number): Promise<void> {
    await this.redis.del(this.getCacheKey(id));
  }
}
