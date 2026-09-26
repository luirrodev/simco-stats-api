import type { ConfigType } from '@nestjs/config';

import config from '@common/utils/config';
import { SimCompaniesSessionService } from './simcompanies-session.service';

describe('SimCompaniesSessionService cookie protection', () => {
  const encryptionKey = Buffer.alloc(32, 7).toString('base64');
  const repository = {
    findOneBy: jest.fn(),
    delete: jest.fn(),
    save: jest.fn(),
  };
  const appConfig = {
    simcompanies: {
      email: 'player@example.com',
      password: 'secret',
      timezoneOffset: 0,
      sessionEncryptionKey: encryptionKey,
    },
  } as unknown as ConfigType<typeof config>;

  const service = new SimCompaniesSessionService(
    repository as never,
    {} as never,
    appConfig,
  );

  it('keeps only cookie pairs and does not persist cookie attributes', () => {
    expect((service as any).serializeCookies([
      'session=abc; Path=/; HttpOnly',
      'csrftoken=def; Secure; SameSite=Lax',
    ])).toBe('session=abc; csrftoken=def');
  });

  it('encrypts cookies with authenticated encryption', () => {
    const encrypted = (service as any).encrypt('session=abc');
    expect(encrypted.ciphertext).not.toContain('session=abc');
    expect(
      (service as any).decrypt({
        encryptedCookie: encrypted.ciphertext,
        encryptionIv: encrypted.iv,
        encryptionTag: encrypted.tag,
      }),
    ).toBe('session=abc');
  });

  it('returns the earliest valid expiration advertised by the cookies', () => {
    const expiry = (service as any).cookieExpiry([
      'session=abc; Expires=Wed, 01 Jan 2031 00:00:00 GMT',
      'csrf=def; Max-Age=3600',
    ]);
    expect(expiry).toBeInstanceOf(Date);
    expect(expiry.getTime()).toBeLessThanOrEqual(Date.now() + 3_601_000);
  });
});
