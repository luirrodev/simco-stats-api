import { HttpException } from '@nestjs/common';

import { AuthRateLimitGuard } from './auth-rate-limit.guard';

const appConfig = {
  auth: {
    cookieName: 'refresh_token',
    loginRateLimit: 2,
    loginRateLimitWindowSeconds: 60,
    refreshRateLimit: 2,
    refreshRateLimitWindowSeconds: 60,
  },
} as any;

describe('AuthRateLimitGuard', () => {
  it('limits login and refresh attempts using Redis counters', async () => {
    const redis = {
      incr: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(3),
      expire: jest.fn().mockResolvedValue(1),
    } as any;
    const logging = {
      warn: jest.fn(),
      createHttpContext: jest.fn().mockReturnValue({}),
    } as any;
    const guard = new AuthRateLimitGuard(redis, appConfig, logging);
    const request = {
      path: '/auth/staff/login',
      ip: '127.0.0.1',
      body: { email: 'ada@example.com' },
      headers: {},
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;

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
    } as any;
    const logging = {
      warn: jest.fn(),
      createHttpContext: jest.fn().mockReturnValue({}),
    } as any;
    const guard = new AuthRateLimitGuard(redis, appConfig, logging);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          path: '/auth/staff/refresh',
          ip: '127.0.0.1',
          headers: { cookie: 'refresh_token=selector.secret' },
        }),
      }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(redis.incr).toHaveBeenCalledWith(
      expect.stringContaining('auth:rate-limit:refresh:'),
    );
  });
});
