import config from '@common/utils/config';
import {
  clearRefreshCookieOptions,
  readCookie,
  refreshCookieOptions,
} from './refresh-cookie.util';

const developmentConfig = {
  app: { nodeEnv: 'dev' },
  auth: {
    refreshTokenTtlDays: 7,
    cookieSameSite: 'lax',
  },
} as ReturnType<typeof config>;

describe('refresh cookie utilities', () => {
  it('uses HttpOnly Lax cookies without Secure during development', () => {
    expect(refreshCookieOptions(developmentConfig)).toMatchObject({
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: false,
      maxAge: 604_800_000,
    });
  });

  it('requires Secure for cross-site and production cookies', () => {
    const crossSiteConfig = {
      ...developmentConfig,
      auth: { ...developmentConfig.auth, cookieSameSite: 'none' as const },
    };
    const productionConfig = {
      ...developmentConfig,
      app: { nodeEnv: 'prod' },
    };

    expect(refreshCookieOptions(crossSiteConfig).secure).toBe(true);
    expect(refreshCookieOptions(productionConfig).secure).toBe(true);
    expect(clearRefreshCookieOptions(productionConfig)).not.toHaveProperty(
      'maxAge',
    );
  });

  it('rejects duplicate refresh cookies', () => {
    expect(readCookie('refresh_token=one', 'refresh_token')).toBe('one');
    expect(
      readCookie('refresh_token=one; refresh_token=two', 'refresh_token'),
    ).toBeUndefined();
  });
});
