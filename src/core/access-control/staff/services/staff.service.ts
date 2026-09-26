import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { User, UserType } from '../../users/entities/user.entity';
import { Staff } from '../entities/staff.entity';
import {
  CreateStaffDto,
  UpdateStaffDto,
  StaffResponseDto,
} from '../dto/staff.dto';
import { RolesService } from '../../roles/services/roles.service';
import { PaginationDto, PaginatedResponse } from '@common/dto/pagination.dto';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
    private readonly roleService: RolesService,
    private readonly dataSource: DataSource,
  ) {}

  private toResponseDto(user: User, staff: Staff | null): StaffResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      secondName: user.secondName,
      lastName: user.lastName,
      secondLastName: user.secondLastName,
      role: user.role.name,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      employeeCode: staff?.employeeCode ?? null,
      department: staff?.department ?? null,
    };
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<StaffResponseDto>> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'id',
      sortDir = 'ASC',
    } = paginationDto;
    const skip = (page - 1) * limit;

    const allowedSortFields = [
      'id',
      'email',
      'firstName',
      'lastName',
      'lastLoginAt',
    ];
    const sortColumn = allowedSortFields.includes(sortBy) ? sortBy : 'id';

    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect(Staff, 'staff', 'staff.user_id = user.id')
      .where('user.user_type = :userType', { userType: UserType.STAFF });

    if (search) {
      qb.andWhere(
        '(user.email LIKE :search OR user.first_name LIKE :search OR user.last_name LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [users, total] = await qb
      .orderBy(`user.${sortColumn}`, sortDir)
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const staffRows = await this.staffRepo.find({
      where: { userId: In(users.map((u) => u.id)) },
    });
    const staffByUserId = new Map(staffRows.map((s) => [s.userId, s]));

    const data = users.map((user) =>
      this.toResponseDto(user, staffByUserId.get(user.id) ?? null),
    );

    const totalPages = Math.ceil(total / limit);
    return {
      data,
      page,
      limit,
      total,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
    };
  }

  async findOne(id: number): Promise<StaffResponseDto> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .where('user.id = :id', { id })
      .andWhere('user.user_type = :userType', { userType: UserType.STAFF })
      .getOne();

    if (!user) {
      throw new NotFoundException('Este staff no existe');
    }

    const staff = await this.staffRepo.findOne({ where: { userId: id } });

    return this.toResponseDto(user, staff);
  }

  async create(data: CreateStaffDto): Promise<StaffResponseDto> {
    const existingUser = await this.userRepo.findOne({
      where: { email: data.email },
      withDeleted: true,
    });

    if (existingUser) {
      throw new ConflictException(
        'Ya existe una cuenta registrada con este correo electrónico',
      );
    }

    const role = await this.roleService.getRoleById(data.role);
    const passwordHash = await bcrypt.hash(data.password, 10);

    return this.dataSource.transaction(async (manager) => {
      const newUser = manager.create(User, {
        email: data.email,
        firstName: data.firstName,
        secondName: data.secondName ?? null,
        lastName: data.lastName,
        secondLastName: data.secondLastName ?? null,
        password: passwordHash,
        authProvider: 'local',
        userType: UserType.STAFF,
        isActive: true,
        role,
      });
      const savedUser = await manager.save(newUser);

      const newStaff = manager.create(Staff, {
        userId: savedUser.id,
        employeeCode: data.employeeCode ?? null,
        department: data.department ?? null,
      });
      const savedStaff = await manager.save(newStaff);

      return this.toResponseDto(savedUser, savedStaff);
    });
  }

  async update(id: number, changes: UpdateStaffDto): Promise<StaffResponseDto> {
    const user = await this.userRepo.findOne({
      where: { id, userType: UserType.STAFF },
    });
    if (!user) {
      throw new NotFoundException('Este staff no existe');
    }

    if (changes.email && changes.email !== user.email) {
      const existingUser = await this.userRepo.findOne({
        where: { email: changes.email },
      });
      if (existingUser) {
        throw new ConflictException('This email is already in use');
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const {
        role: roleId,
        employeeCode,
        department,
        password,
        ...rest
      } = changes;

      manager.merge(User, user, rest);

      if (password) {
        user.password = await bcrypt.hash(password, 10);
      }

      if (roleId) {
        user.role = await this.roleService.getRoleById(roleId);
      }

      const savedUser = await manager.save(user);

      let staff = await manager.findOne(Staff, { where: { userId: id } });
      staff ??= manager.create(Staff, { userId: id });
      if (employeeCode !== undefined) {
        staff.employeeCode = employeeCode;
      }
      if (department !== undefined) {
        staff.department = department;
      }
      const savedStaff = await manager.save(staff);

      return this.toResponseDto(savedUser, savedStaff);
    });
  }

  async remove(id: number): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({
      where: { id, userType: UserType.STAFF },
    });
    if (!user) {
      throw new NotFoundException('Este staff no existe');
    }

    await this.userRepo.softDelete(id);

    return { message: 'Staff deleted successfully' };
  }

  async updatePassword(userId: number, newPassword: string): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId, userType: UserType.STAFF },
    });
    if (!user) {
      throw new NotFoundException(`No Staff found with id ${userId}`);
    }

    if (!newPassword || newPassword.trim().length < 8) {
      throw new BadRequestException('Password debe tener mínimo 8 caracteres');
    }

    if (user.password) {
      const isSameAsOld = await bcrypt.compare(newPassword, user.password);
      if (isSameAsOld) {
        throw new BadRequestException(
          'La nueva contraseña debe ser diferente a la anterior',
        );
      }
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);
  }

  async verifyPassword(
    userId: number,
    plainPassword: string,
  ): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { id: userId, userType: UserType.STAFF },
    });
    if (!user?.password) {
      return false;
    }

    return bcrypt.compare(plainPassword, user.password);
  }
}
