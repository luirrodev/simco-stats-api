import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';

import { UsersService } from '../services/users.service';
import { UserEntity } from '../entities/user.entity';
import { JWTAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JWTAuthGuard) // Protege todos los endpoints
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(): Promise<UserEntity[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<UserEntity> {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() userData: Partial<UserEntity>): Promise<UserEntity> {
    return this.usersService.create(userData);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() userData: Partial<UserEntity>,
  ): Promise<UserEntity> {
    return this.usersService.update(id, userData);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.usersService.remove(id);
  }
}
