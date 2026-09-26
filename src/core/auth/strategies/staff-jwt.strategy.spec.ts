import { UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Repository } from 'typeorm';

import config from '@common/utils/config';
import { User } from '@core/access-control/users/entities/user.entity';
import { AuthSession } from '../entities/auth-session.entity';
import { StaffJwtStrategy } from './staff-jwt.strategy';

const appConfig = {
  jwt: {
    accessTokenSecret: 'a'.repeat(32),
    issuer: 'qvawin-api',
    audience: 'qvawin-staff',
  },
} as unknown as ConfigType<typeof config>;

const payload = {
  sub: 1,
  sid: 'a0a1e3c8-3be8-4cd0-bd2c-8eaf8e87e91c',
  type: 'staff' as const,
  roleId: 1,
  roleVersion: 3,
};

describe('StaffJwtStrategy', () => {
  it('accepts an active user with an active session', async () => {
    const userRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        email: 'ada@example.com',
        firstName: 'Ada',
        secondName: null,
        lastName: 'Lovelace',
        secondLastName: null,
        isActive: true,
        role: { name: 'administrator', version: 3, permissions: [] },
      }),
    } as unknown as Repository<User>;
    const sessionRepo = {
      findOne: jest.fn().mockResolvedValue({ id: payload.sid }),
    } as unknown as Repository<AuthSession>;
    const strategy = new StaffJwtStrategy(appConfig, userRepo, sessionRepo);

    await expect(strategy.validate(payload)).resolves.toMatchObject({
      email: 'ada@example.com',
      sid: payload.sid,
    });
  });

  it('rejects a revoked or missing session', async () => {
    const userRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        isActive: true,
        role: { name: 'administrator', version: 3, permissions: [] },
      }),
    } as unknown as Repository<User>;
    const strategy = new StaffJwtStrategy(appConfig, userRepo, {
      findOne: jest.fn().mockResolvedValue(null),
    } as unknown as Repository<AuthSession>);

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
