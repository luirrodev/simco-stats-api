import {
  cookieExpiry,
  decryptSessionCookie,
  encryptSessionCookie,
  serializeSetCookies,
} from './simcompanies-session.util';

describe('SimCompanies session utilities', () => {
  const encryptionKey = Buffer.alloc(32, 7);

  it('keeps only cookie pairs and does not persist cookie attributes', () => {
    expect(
      serializeSetCookies([
        'session=abc; Path=/; HttpOnly',
        'csrftoken=def; Secure; SameSite=Lax',
      ]),
    ).toBe('session=abc; csrftoken=def');
  });

  it('encrypts cookies with authenticated encryption', () => {
    const encrypted = encryptSessionCookie('session=abc', encryptionKey);
    expect(encrypted.ciphertext).not.toContain('session=abc');
    expect(decryptSessionCookie(encrypted, encryptionKey)).toBe('session=abc');
  });

  it('returns the earliest valid expiration advertised by the cookies', () => {
    const expiry = cookieExpiry([
      'session=abc; Expires=Wed, 01 Jan 2031 00:00:00 GMT',
      'csrf=def; Max-Age=3600',
    ]);
    expect(expiry).toBeInstanceOf(Date);
    expect(expiry?.getTime()).toBeLessThanOrEqual(Date.now() + 3_601_000);
  });
});
