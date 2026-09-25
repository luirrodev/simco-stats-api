import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import type { ConfigType } from '@nestjs/config';
import type { JwtSignOptions } from '@nestjs/jwt';
import { randomBytes, randomUUID } from 'crypto';
import type { Request } from 'express';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import config from '@common/utils/config';
import { PayloadToken } from '@common/types/jwt.payload';
import {
  User,
  UserType,
} from '@core/access-control/users/entities/user.entity';
import { LoggingService } from '@core/logs/services/logging.service';
import { AuthRefreshToken } from '../entities/auth-refresh-token.entity';
import { AuthSession } from '../entities/auth-session.entity';

export interface AccessTokenResponse {
  accessToken: string;
}

export interface AuthTokenPair extends AccessTokenResponse {
  refreshToken: string;
}

const INVALID_AUTH_MESSAGE = 'Autenticación no válida';
const REFRESH_SECRET_LENGTH = 64;

@Injectable()
export class StaffAuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(AuthSession)
    private readonly sessionRepo: Repository<AuthSession>,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly loggingService: LoggingService,
    @Inject(config.KEY)
    private readonly configService: ConfigType<typeof config>,
  ) {}

  async login(
    email: string,
    password: string,
    request: Request,
  ): Promise<AuthTokenPair> {
    const user = await this.userRepo.findOne({ where: { email } });

    if (
      user?.userType !== UserType.STAFF ||
      !user.password ||
      !user.isActive ||
      !(await bcrypt.compare(password, user.password))
    ) {
      this.logAuthenticationEvent('Staff login failed', request, {
        operation: 'login',
      });
      throw new UnauthorizedException(INVALID_AUTH_MESSAGE);
    }

    const session = this.sessionRepo.create({
      userId: user.id,
      userAgent: request.get('user-agent') ?? null,
      ip: request.ip ?? null,
      expiresAt: this.refreshExpiry(),
      revokedAt: null,
    });
    const savedSession = await this.sessionRepo.save(session);
    const tokens = await this.issueTokens(user, savedSession);
    await this.storeRefreshToken(savedSession, tokens.refreshToken);

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);
    return tokens;
  }

  async refresh(
    rawRefreshToken: string | undefined,
    request: Request,
  ): Promise<AuthTokenPair> {
    const parsedToken = this.parseRefreshToken(rawRefreshToken);
    if (!parsedToken) {
      this.logAuthenticationEvent('Invalid staff refresh attempt', request, {
        operation: 'refresh',
      });
      throw new UnauthorizedException(INVALID_AUTH_MESSAGE);
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        // Lock only the token row. PostgreSQL cannot lock a nullable LEFT JOIN.
        const token = await manager.getRepository(AuthRefreshToken).findOne({
          where: { id: parsedToken.id },
          lock: { mode: 'pessimistic_write' },
        });

        if (
          !token ||
          !(await bcrypt.compare(parsedToken.secret, token.tokenHash))
        ) {
          throw new UnauthorizedException(INVALID_AUTH_MESSAGE);
        }

        const now = new Date();
        const session = await manager.getRepository(AuthSession).findOne({
          where: { id: token.sessionId },
          relations: ['user', 'user.role'],
        });
        if (!session) throw new UnauthorizedException(INVALID_AUTH_MESSAGE);
        if (
          token.usedAt ||
          token.revokedAt ||
          session.revokedAt ||
          token.expiresAt <= now ||
          session.expiresAt <= now
        ) {
          if (!session.revokedAt) {
            session.revokedAt = now;
            await manager.save(session);
          }
          this.logAuthenticationEvent(
            'Staff refresh token reuse detected',
            request,
            {
              operation: 'refresh',
              userId: session.userId,
            },
          );
          throw new UnauthorizedException(INVALID_AUTH_MESSAGE);
        }

        if (
          !session.user.isActive ||
          session.user.userType !== UserType.STAFF
        ) {
          session.revokedAt = now;
          await manager.save(session);
          throw new UnauthorizedException(INVALID_AUTH_MESSAGE);
        }

        token.usedAt = now;
        await manager.save(token);

        const tokens = await this.issueTokens(session.user, session);
        await this.storeRefreshToken(session, tokens.refreshToken, manager);
        return tokens;
      });
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) throw error;
      this.logAuthenticationEvent('Invalid staff refresh attempt', request, {
        operation: 'refresh',
      });
      throw error;
    }
  }

  async logout(
    rawRefreshToken: string | undefined,
    request: Request,
  ): Promise<void> {
    const parsedToken = this.parseRefreshToken(rawRefreshToken);
    if (!parsedToken) return;

    await this.dataSource.transaction(async (manager) => {
      const token = await manager.getRepository(AuthRefreshToken).findOne({
        where: { id: parsedToken.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (
        !token ||
        !(await bcrypt.compare(parsedToken.secret, token.tokenHash))
      ) {
        return;
      }

      const session = await manager.getRepository(AuthSession).findOne({
        where: { id: token.sessionId },
      });
      if (session && !session.revokedAt) {
        session.revokedAt = new Date();
        await manager.save(session);
        this.logAuthenticationEvent('Staff session revoked', request, {
          operation: 'logout',
          userId: session.userId,
        });
      }
    });
  }

  private async issueTokens(
    user: User,
    session: AuthSession,
  ): Promise<AuthTokenPair> {
    const payload: PayloadToken = {
      sub: user.id,
      sid: session.id,
      type: 'staff',
      roleId: user.roleId,
      roleVersion: user.role.version,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.jwt.accessTokenSecret,
      issuer: this.configService.jwt.issuer,
      audience: this.configService.jwt.audience,
      jwtid: randomUUID(),
      expiresIn: this.configService.jwt
        .accessTokenExpiresIn as JwtSignOptions['expiresIn'],
    });

    return {
      accessToken,
      refreshToken: this.createOpaqueRefreshToken(),
    };
  }

  private async storeRefreshToken(
    session: AuthSession,
    rawRefreshToken: string,
    manager = this.dataSource.manager,
  ): Promise<void> {
    const parsedToken = this.parseRefreshToken(rawRefreshToken);
    if (!parsedToken) throw new Error('Generated invalid refresh token');

    const refreshToken = manager.create(AuthRefreshToken, {
      id: parsedToken.id,
      sessionId: session.id,
      tokenHash: await bcrypt.hash(parsedToken.secret, 12),
      expiresAt: session.expiresAt,
      usedAt: null,
      revokedAt: null,
    });
    await manager.save(refreshToken);
  }

  private createOpaqueRefreshToken(): string {
    return `${randomUUID()}.${randomBytes(48).toString('base64url')}`;
  }

  private parseRefreshToken(
    rawRefreshToken: string | undefined,
  ): { id: string; secret: string } | null {
    if (!rawRefreshToken) return null;
    const tokenParts = rawRefreshToken.split('.');
    const id = tokenParts.at(0) ?? '';
    const secret = tokenParts.at(1) ?? '';
    const extra = tokenParts.at(2);
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      );
    const isSecret = new RegExp(
      `^[A-Za-z0-9_-]{${REFRESH_SECRET_LENGTH}}$`,
    ).test(secret);
    return !extra && isUuid && isSecret ? { id, secret } : null;
  }

  private refreshExpiry(): Date {
    return new Date(
      Date.now() + this.configService.auth.refreshTokenTtlDays * 86_400_000,
    );
  }

  private logAuthenticationEvent(
    message: string,
    request: Request,
    metadata: Record<string, unknown>,
  ): void {
    this.loggingService.warn(
      message,
      this.loggingService.createHttpContext(request),
      metadata,
    );
  }
}
