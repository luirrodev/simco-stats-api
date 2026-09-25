import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';

import config from '@common/utils/config';
import { AuthOriginGuard } from './auth-origin.guard';

describe('AuthOriginGuard', () => {
  const appConfig = {
    auth: {
      cookieSameSite: 'none',
      frontendOrigin: 'https://app.example.com',
    },
  } as unknown as ConfigType<typeof config>;

  it('requires the configured origin for cross-site refresh cookies', () => {
    const guard = new AuthOriginGuard(appConfig);
    const context = (origin: string | undefined) =>
      ({
        switchToHttp: () => ({ getRequest: () => ({ get: () => origin }) }),
      }) as unknown as ExecutionContext;

    expect(guard.canActivate(context('https://app.example.com'))).toBe(true);
    expect(() => guard.canActivate(context('https://evil.example'))).toThrow(
      ForbiddenException,
    );
  });
});
