import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Like,
  FindOptionsOrder,
  FindOptionsWhere,
} from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { User } from '../entities/user.entity';
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
} from '../dtos/user.dto';
import { RolesService } from '../../roles/services/roles.service';
import { PaginationDto, PaginatedResponse } from '@common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly roleService: RolesService,
  ) {}

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'id',
      sortDir = 'ASC',
    } = paginationDto;
    const skip = (page - 1) * limit;

    const whereOptions: FindOptionsWhere<User>[] = [];

    if (search) {
      whereOptions.push(
        { email: Like(`%${search}%`) },
        { firstName: Like(`%${search}%`) },
        { lastName: Like(`%${search}%`) },
      );
    }

    const order: FindOptionsOrder<User> = {
      [sortBy]: sortDir,
    };

    const [users, total] = await this.userRepo.findAndCount({
      where: whereOptions.length > 0 ? whereOptions : undefined,
      relations: ['role'],
      skip,
      take: limit,
      order,
    });

    const data: UserResponseDto[] = users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      secondName: user.secondName,
      lastName: user.lastName,
      secondLastName: user.secondLastName,
      role: user.role.name,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
    }));

    const totalPages = Math.ceil(total / limit);
    const response: PaginatedResponse<UserResponseDto> = {
      data,
      page,
      limit,
      total,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
    };

    return response;
  }

  async findOne(id: number) {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) {
      throw new NotFoundException('This user does not exist');
    }

    return user;
  }

  async create(data: CreateUserDto) {
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

    const newUser = this.userRepo.create({
      email: data.email,
      firstName: data.firstName,
      secondName: data.secondName ?? null,
      lastName: data.lastName,
      secondLastName: data.secondLastName ?? null,
    });
    newUser.role = role;

    if (role.name !== 'customer' && data.password) {
      newUser.password = await bcrypt.hash(data.password, 10);
      newUser.authProvider = 'local';
      newUser.isActive = true;
    }

    const savedUser = await this.userRepo.save(newUser);

    return savedUser;
  }

  async update(id: number, changes: UpdateUserDto): Promise<User> {
    const userToUpdate = await this.findOne(id);

    if (changes.email && changes.email !== userToUpdate.email) {
      const existingUser = await this.userRepo.findOne({
        where: { email: changes.email },
      });
      if (existingUser) {
        throw new ConflictException('This email is already in use');
      }
    }

    let passwordHash: string | undefined;
    if (changes.password) {
      passwordHash = await bcrypt.hash(changes.password, 10);
    }

    const { role: _role, password: _password, ...restChanges } = changes;

    if (_role) {
      const role = await this.roleService.getRoleById(_role);
      this.userRepo.merge(userToUpdate, restChanges);
      if (passwordHash) {
        userToUpdate.password = passwordHash;
      }
      userToUpdate.role = role;
    } else {
      this.userRepo.merge(userToUpdate, restChanges);
      if (passwordHash) {
        userToUpdate.password = passwordHash;
      }
    }

    const updated = await this.userRepo.save(userToUpdate);

    return updated;
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.userRepo.softDelete(id);

    return { message: 'User deleted successfully' };
  }

  async updateLastLogin(userId: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`No User found with id ${userId}`);
    }

    user.lastLoginAt = new Date();
    return this.userRepo.save(user);
  }

  async updatePassword(userId: number, newPassword: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['role'],
    });
    if (!user) {
      throw new NotFoundException(`No User found with id ${userId}`);
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
    user.authProvider = 'local';

    return this.userRepo.save(user);
  }

  async verifyPassword(
    userId: number,
    plainPassword: string,
  ): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.password) {
      return false;
    }

    return bcrypt.compare(plainPassword, user.password);
  }
}
