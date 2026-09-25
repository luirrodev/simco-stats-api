import { HttpException, type ExecutionContext } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type Redis from 'ioredis';

import config from '@common/utils/config';
import type { LoggingService } from '@core/logs/services/logging.service';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';

jest.mock('@core/logs/services/logging.service', () => ({
  LoggingService: jest.fn(),
}));

const appConfig = {
  auth: {
    cookieName: 'refresh_token',
    loginRateLimit: 2,
    loginRateLimitWindowSeconds: 60,
    refreshRateLimit: 2,
    refreshRateLimitWindowSeconds: 60,
  },
} as unknown as ConfigType<typeof config>;

describe('AuthRateLimitGuard', () => {
  it('limits login and refresh attempts using Redis counters', async () => {
    const redis = {
      incr: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(3),
      expire: jest.fn().mockResolvedValue(1),
    } as unknown as Redis;
    const logging = {
      warn: jest.fn(),
      createHttpContext: jest.fn().mockReturnValue({}),
    } as unknown as LoggingService;
    const guard = new AuthRateLimitGuard(redis, appConfig, logging);
    const request = {
      path: '/auth/staff/login',
      ip: '127.0.0.1',
      body: { email: 'ada@example.com' },
      headers: {},
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(redis.expire).toHaveBeenCalledWith(expect.any(String), 60);
  });

  it('applies an independent limit to refresh attempts', async () => {
    const redis = {
      incr: jest.fn().mockResolvedValue(3),
      expire: jest.fn(),
    } as unknown as Redis;
    const logging = {
      warn: jest.fn(),
      createHttpContext: jest.fn().mockReturnValue({}),
    } as unknown as LoggingService;
    const guard = new AuthRateLimitGuard(redis, appConfig, logging);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          path: '/auth/staff/refresh',
          ip: '127.0.0.1',
          headers: { cookie: 'refresh_token=selector.secret' },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(redis.incr).toHaveBeenCalledWith(
      expect.stringContaining('auth:rate-limit:refresh:'),
    );
  });
});
