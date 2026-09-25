import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { AuthRefreshToken } from '../entities/auth-refresh-token.entity';
import { StaffAuthService } from './staff-auth.service';

const appConfig = {
  jwt: {
    accessTokenSecret: 'a'.repeat(32),
    accessTokenExpiresIn: '15m',
    issuer: 'qvawin-api',
    audience: 'qvawin-staff',
  },
  auth: { refreshTokenTtlDays: 7 },
} as any;

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
      getRepository: jest.fn((entity) =>
        entity === AuthRefreshToken ? refreshTokenRepo : authSessionRepo,
      ),
      create: jest.fn((_entity, data) => data),
      save: jest.fn().mockResolvedValue(undefined),
    } as any;
    const dataSource = {
      manager,
      transaction: jest.fn((work) => work(manager)),
    } as any;
    const logger = {
      warn: jest.fn(),
      createHttpContext: jest.fn().mockReturnValue({}),
    } as any;
    const service = new StaffAuthService(
      {} as any,
      {} as any,
      dataSource,
      { signAsync: jest.fn().mockResolvedValue('access-token') } as JwtService,
      logger,
      appConfig,
    );
    const request = {
      get: jest.fn().mockReturnValue(null),
      ip: '127.0.0.1',
    } as any;

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
