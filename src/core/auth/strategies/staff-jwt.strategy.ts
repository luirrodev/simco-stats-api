import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IsNull, MoreThan, Repository } from 'typeorm';

import config from '@common/utils/config';
import type {
  AuthenticatedUser,
  PayloadToken,
} from '@common/types/jwt.payload';
import {
  User,
  UserType,
} from '@core/access-control/users/entities/user.entity';
import { AuthSession } from '../entities/auth-session.entity';

const INVALID_AUTH_MESSAGE = 'Autenticación no válida';

@Injectable()
export class StaffJwtStrategy extends PassportStrategy(Strategy, 'staff-jwt') {
  constructor(
    @Inject(config.KEY)
    private readonly configService: ConfigType<typeof config>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(AuthSession)
    private readonly sessionRepo: Repository<AuthSession>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.jwt.accessTokenSecret,
      issuer: configService.jwt.issuer,
      audience: configService.jwt.audience,
    });
  }

  async validate(payload: PayloadToken): Promise<AuthenticatedUser> {
    if (payload.type !== 'staff' || !payload.sid || !payload.roleId) {
      throw new UnauthorizedException(INVALID_AUTH_MESSAGE);
    }

    const [user, session] = await Promise.all([
      this.userRepo.findOne({
        where: { id: payload.sub, userType: UserType.STAFF },
        relations: ['role', 'role.permissions'],
      }),
      this.sessionRepo.findOne({
        where: {
          id: payload.sid,
          userId: payload.sub,
          revokedAt: IsNull(),
          expiresAt: MoreThan(new Date()),
        },
      }),
    ]);

    if (
      !user ||
      !session ||
      !user.isActive ||
      payload.roleVersion !== user.role.version
    ) {
      throw new UnauthorizedException(INVALID_AUTH_MESSAGE);
    }

    return {
      ...payload,
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      secondName: user.secondName,
      lastName: user.lastName,
      secondLastName: user.secondLastName,
      role: user.role.name,
      permissions: user.role.permissions.map((permission) => permission.name),
    };
  }
}
