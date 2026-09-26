import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export interface EncryptedSessionCookie {
  ciphertext: string;
  iv: string;
  tag: string;
}

function cookieValues(setCookie: string[] | string | undefined): string[] {
  return Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
}

export function serializeSetCookies(
  setCookie: string[] | string | undefined,
): string {
  const cookies = new Map<string, string>();
  for (const value of cookieValues(setCookie)) {
    const pair = value.split(';', 1).at(0) ?? '';
    const separator = pair.indexOf('=');
    if (separator > 0) cookies.set(pair.slice(0, separator), pair);
  }
  return [...cookies.values()].join('; ');
}

export function cookieExpiry(
  setCookie: string[] | string | undefined,
): Date | null {
  const expirations = cookieValues(setCookie).flatMap((value) => {
    const maxAge = /;\s*Max-Age=(-?\d+)/i.exec(value);
    if (maxAge) return [new Date(Date.now() + Number(maxAge[1]) * 1000)];
    const expires = /;\s*Expires=([^;]+)/i.exec(value);
    const date = expires ? new Date(expires[1]) : null;
    return date && !Number.isNaN(date.getTime()) ? [date] : [];
  });
  return expirations.length
    ? new Date(Math.min(...expirations.map((date) => date.getTime())))
    : null;
}

export function encryptSessionCookie(
  value: string,
  encryptionKey: Buffer,
): EncryptedSessionCookie {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  return {
    ciphertext: Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]).toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

export function decryptSessionCookie(
  encrypted: EncryptedSessionCookie,
  encryptionKey: Buffer,
): string {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey,
    Buffer.from(encrypted.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
