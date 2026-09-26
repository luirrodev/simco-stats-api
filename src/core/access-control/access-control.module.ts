import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './users/entities/user.entity';
import { Role } from './roles/entities/role.entity';
import { Permission } from './permissions/entities/permission.entity';

import { UsersV2Controller } from './users/controllers/users-v2.controller';
import { RolesV2Controller } from './roles/controllers/roles-v2.controller';
import { PermissionsV2Controller } from './permissions/controllers/permissions-v2.controller';

import { UsersService } from './users/services/users.service';
import { RolesService } from './roles/services/roles.service';
import { PermissionsService } from './permissions/services/permissions.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Permission])],
  controllers: [UsersV2Controller, RolesV2Controller, PermissionsV2Controller],
  providers: [UsersService, RolesService, PermissionsService],
  exports: [UsersService, RolesService, PermissionsService],
})
export class AccessControlModule {}
