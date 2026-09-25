import { JwtService } from '@nestjs/jwt';
import type { ConfigType } from '@nestjs/config';
import type { Request } from 'express';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import config from '@common/utils/config';
import { User } from '@core/access-control/users/entities/user.entity';
import type { LoggingService } from '@core/logs/services/logging.service';
import { AuthRefreshToken } from '../entities/auth-refresh-token.entity';
import { AuthSession } from '../entities/auth-session.entity';
import { StaffAuthService } from './staff-auth.service';

jest.mock('@core/logs/services/logging.service', () => ({
  LoggingService: jest.fn(),
}));

const appConfig = {
  jwt: {
    accessTokenSecret: 'a'.repeat(32),
    accessTokenExpiresIn: '15m',
    issuer: 'qvawin-api',
    audience: 'qvawin-staff',
  },
  auth: { refreshTokenTtlDays: 7 },
} as unknown as ConfigType<typeof config>;

describe('StaffAuthService refresh rotation', () => {
  it('rotates a valid token and revokes its session on reuse', async () => {
    const id = 'a0a1e3c8-3be8-4cd0-bd2c-8eaf8e87e91c';
    const secret = 'a'.repeat(64);
    const session = {
      id: 'b0a1e3c8-3be8-4cd0-bd2c-8eaf8e87e91c',
      userId: 1,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: 1,
        roleId: 1,
        userType: 'staff',
        isActive: true,
        role: { version: 1 },
      },
    };
    const token = {
      id,
      sessionId: session.id,
      tokenHash: await bcrypt.hash(secret, 4),
      usedAt: null,
      revokedAt: null,
      expiresAt: session.expiresAt,
    };
    const refreshTokenRepo = { findOne: jest.fn().mockResolvedValue(token) };
    const authSessionRepo = { findOne: jest.fn().mockResolvedValue(session) };
    const manager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === AuthRefreshToken ? refreshTokenRepo : authSessionRepo,
      ),
      create: jest.fn((_entity: unknown, data: unknown) => data),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as EntityManager;
    const dataSource = {
      manager,
      transaction: jest.fn(
        (work: (transactionalManager: EntityManager) => Promise<unknown>) =>
          work(manager),
      ),
    } as unknown as DataSource;
    const logger = {
      warn: jest.fn(),
      createHttpContext: jest.fn().mockReturnValue({}),
    } as unknown as LoggingService;
    const service = new StaffAuthService(
      {} as unknown as Repository<User>,
      {} as unknown as Repository<AuthSession>,
      dataSource,
      { signAsync: jest.fn().mockResolvedValue('access-token') } as JwtService,
      logger,
      appConfig,
    );
    const request = {
      get: jest.fn().mockReturnValue(null),
      ip: '127.0.0.1',
    } as unknown as Request;

    const rotated = await service.refresh(`${id}.${secret}`, request);
    expect(rotated).toEqual(
      expect.objectContaining({ accessToken: 'access-token' }),
    );
    expect(rotated.refreshToken).not.toBe(`${id}.${secret}`);
    expect(token.usedAt).toBeInstanceOf(Date);
    expect(refreshTokenRepo.findOne).toHaveBeenCalledWith({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });

    await expect(service.refresh(`${id}.${secret}`, request)).rejects.toThrow(
      'Autenticación no válida',
    );
    expect(session.revokedAt).toBeInstanceOf(Date);
  });
});
