import { BadGatewayException, Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';

import config from '@common/utils/config';
import { SimCompaniesSession } from '../entities/simcompanies-session.entity';

const SESSION_ID = 'default';
const BASE_URL = 'https://www.simcompanies.com';
const CSRF_URL = `${BASE_URL}/api/csrf/`;
const LOGIN_URL = `${BASE_URL}/api/v2/auth/email/auth/`;
const USER_AGENT =
  'Mozilla/5.0 (compatible; SimCoStatsAPI/1.0; +https://www.simcompanies.com/)';

export interface SimCompaniesSessionStatus {
  hasSession: boolean;
  isValid: boolean;
  expiresAt: Date | null;
}

@Injectable()
export class SimCompaniesSessionService {
  private renewalPromise: Promise<string> | null = null;
  private readonly encryptionKey: Buffer;

  constructor(
    @InjectRepository(SimCompaniesSession)
    private readonly sessionRepository: Repository<SimCompaniesSession>,
    private readonly httpService: HttpService,
    @Inject(config.KEY)
    private readonly appConfig: ConfigType<typeof config>,
  ) {
    this.encryptionKey = Buffer.from(
      this.appConfig.simcompanies.sessionEncryptionKey,
      'base64',
    );
    if (this.encryptionKey.length !== 32) {
      throw new Error('Invalid SimCompanies session encryption key');
    }
  }

  async getValidCookie(): Promise<string> {
    const session = await this.findSession();
    if (session && this.isValid(session)) {
      try {
        return this.decrypt(session);
      } catch {
        await this.invalidate();
      }
    }
    return this.renew();
  }

  async invalidate(): Promise<void> {
    await this.sessionRepository.delete({ id: SESSION_ID });
  }

  async getStatus(): Promise<SimCompaniesSessionStatus> {
    const session = await this.findSession();
    return {
      hasSession: Boolean(session),
      isValid: Boolean(session && this.isValid(session)),
      expiresAt: session?.expiresAt ?? null,
    };
  }

  private async renew(): Promise<string> {
    if (!this.renewalPromise) {
      this.renewalPromise = this.authenticateAndPersist().finally(() => {
        this.renewalPromise = null;
      });
    }
    return this.renewalPromise;
  }

  private async authenticateAndPersist(): Promise<string> {
    const csrfResponse = await this.requestCsrf();
    const csrfToken = csrfResponse.data?.csrfToken;
    const csrfCookies = this.serializeCookies(
      csrfResponse.headers['set-cookie'],
    );
    if (!csrfToken || !csrfCookies) {
      throw new BadGatewayException(
        'SimCompanies returned an invalid CSRF response',
      );
    }

    try {
      const loginResponse = await firstValueFrom(
        this.httpService.post(
          LOGIN_URL,
          {
            email: this.appConfig.simcompanies.email,
            password: this.appConfig.simcompanies.password,
            timezone_offset: this.appConfig.simcompanies.timezoneOffset,
          },
          {
            headers: {
              ...this.baseHeaders(),
              'X-CSRFToken': csrfToken,
              Cookie: csrfCookies,
            },
          },
        ),
      );
      const sessionCookie = this.serializeCookies(
        loginResponse.headers['set-cookie'],
      );
      if (!sessionCookie) {
        throw new BadGatewayException(
          'SimCompanies did not return a session cookie',
        );
      }

      await this.persist(
        sessionCookie,
        this.cookieExpiry(loginResponse.headers['set-cookie']),
      );
      return sessionCookie;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new BadGatewayException('Unable to authenticate with SimCompanies');
    }
  }

  private async requestCsrf() {
    try {
      return await firstValueFrom(
        this.httpService.get<{ csrfToken?: string }>(CSRF_URL),
      );
    } catch {
      throw new BadGatewayException(
        'Unable to retrieve a CSRF token from SimCompanies',
      );
    }
  }

  private async persist(cookie: string, expiresAt: Date | null): Promise<void> {
    const encrypted = this.encrypt(cookie);
    await this.sessionRepository.save({
      id: SESSION_ID,
      encryptedCookie: encrypted.ciphertext,
      encryptionIv: encrypted.iv,
      encryptionTag: encrypted.tag,
      expiresAt,
    });
  }

  private async findSession(): Promise<SimCompaniesSession | null> {
    return this.sessionRepository.findOneBy({ id: SESSION_ID });
  }

  private isValid(session: SimCompaniesSession): boolean {
    return !session.expiresAt || session.expiresAt.getTime() > Date.now();
  }

  private baseHeaders(): Record<string, string> {
    return {
      Origin: BASE_URL,
      Referer: `${BASE_URL}/`,
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/json',
    };
  }

  private serializeCookies(setCookie: string[] | string | undefined): string {
    const values = Array.isArray(setCookie)
      ? setCookie
      : setCookie
        ? [setCookie]
        : [];
    const cookies = new Map<string, string>();
    for (const value of values) {
      const pair = value.split(';', 1)[0]?.trim();
      const separator = pair?.indexOf('=') ?? -1;
      if (pair && separator > 0) cookies.set(pair.slice(0, separator), pair);
    }
    return [...cookies.values()].join('; ');
  }

  private cookieExpiry(setCookie: string[] | string | undefined): Date | null {
    const values = Array.isArray(setCookie)
      ? setCookie
      : setCookie
        ? [setCookie]
        : [];
    const expirations = values.flatMap((value) => {
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

  private encrypt(value: string): {
    ciphertext: string;
    iv: string;
    tag: string;
  } {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    return {
      ciphertext: Buffer.concat([
        cipher.update(value, 'utf8'),
        cipher.final(),
      ]).toString('base64'),
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
    };
  }

  private decrypt(session: SimCompaniesSession): string {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(session.encryptionIv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(session.encryptionTag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(session.encryptedCookie, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  getRequestHeaders(cookie: string): Record<string, string> {
    return { ...this.baseHeaders(), Cookie: cookie };
  }
}
