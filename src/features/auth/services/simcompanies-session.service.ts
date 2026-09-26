import {
  BadGatewayException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';

import config from '@common/utils/config';
import { SimCompaniesSession } from '../entities/simcompanies-session.entity';
import {
  cookieExpiry,
  decryptSessionCookie,
  encryptSessionCookie,
  serializeSetCookies,
} from '../utils/simcompanies-session.util';

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

export interface SimCompaniesLoginResult {
  message: string;
  authenticatedAt: Date;
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
        return decryptSessionCookie(
          {
            ciphertext: session.encryptedCookie,
            iv: session.encryptionIv,
            tag: session.encryptionTag,
          },
          this.encryptionKey,
        );
      } catch {
        await this.invalidate();
      }
    }
    return this.renew();
  }

  async invalidate(): Promise<void> {
    await this.sessionRepository.delete({ id: SESSION_ID });
  }

  async forceLogin(): Promise<SimCompaniesLoginResult> {
    await this.invalidate();
    await this.renew();

    const session = await this.findSession();
    if (!session || !this.isValid(session)) {
      throw new InternalServerErrorException(
        'SimCompanies authentication did not create a valid session',
      );
    }

    return {
      message: 'SimCompanies authentication completed successfully',
      authenticatedAt: session.updatedAt,
      isValid: true,
      expiresAt: session.expiresAt,
    };
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
    this.renewalPromise ??= this.authenticateAndPersist().finally(() => {
      this.renewalPromise = null;
    });
    return this.renewalPromise;
  }

  private async authenticateAndPersist(): Promise<string> {
    const csrfResponse = await this.requestCsrf();
    const csrfToken = csrfResponse.data.csrfToken;
    const csrfCookies = serializeSetCookies(csrfResponse.headers['set-cookie']);
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
      const sessionCookie = serializeSetCookies(
        loginResponse.headers['set-cookie'],
      );
      if (!sessionCookie) {
        throw new BadGatewayException(
          'SimCompanies did not return a session cookie',
        );
      }

      await this.persist(
        sessionCookie,
        cookieExpiry(loginResponse.headers['set-cookie']),
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
    const encrypted = encryptSessionCookie(cookie, this.encryptionKey);
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

  getRequestHeaders(cookie: string): Record<string, string> {
    return { ...this.baseHeaders(), Cookie: cookie };
  }
}
