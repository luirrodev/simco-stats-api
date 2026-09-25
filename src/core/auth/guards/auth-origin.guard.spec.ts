import { ForbiddenException } from '@nestjs/common';

import { AuthOriginGuard } from './auth-origin.guard';

describe('AuthOriginGuard', () => {
  const appConfig = {
    auth: {
      cookieSameSite: 'none',
      frontendOrigin: 'https://app.example.com',
    },
  } as any;

  it('requires the configured origin for cross-site refresh cookies', () => {
    const guard = new AuthOriginGuard(appConfig);
    const context = (origin: string | undefined) =>
      ({
        switchToHttp: () => ({ getRequest: () => ({ get: () => origin }) }),
      }) as any;

    expect(guard.canActivate(context('https://app.example.com'))).toBe(true);
    expect(() => guard.canActivate(context('https://evil.example'))).toThrow(
      ForbiddenException,
    );
  });
});
