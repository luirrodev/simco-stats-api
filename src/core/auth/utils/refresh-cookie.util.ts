import type { CookieOptions } from 'express';
import type { ConfigType } from '@nestjs/config';

import config from '@common/utils/config';

export function refreshCookieOptions(
  appConfig: ConfigType<typeof config>,
): CookieOptions {
  const secure =
    appConfig.app.nodeEnv === 'prod' ||
    appConfig.auth.cookieSameSite === 'none';

  return {
    httpOnly: true,
    secure,
    sameSite: appConfig.auth.cookieSameSite,
    path: '/',
    maxAge: appConfig.auth.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  };
}

export function clearRefreshCookieOptions(
  appConfig: ConfigType<typeof config>,
): CookieOptions {
  const options = refreshCookieOptions(appConfig);
  delete options.maxAge;
  return options;
}

export function readCookie(
  cookieHeader: string | undefined,
  cookieName: string,
): string | undefined {
  if (!cookieHeader) return undefined;

  const matches = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${cookieName}=`));

  // Reject duplicate cookies to avoid choosing an attacker-controlled value.
  if (matches.length !== 1) return undefined;
  return matches[0].slice(cookieName.length + 1);
}
