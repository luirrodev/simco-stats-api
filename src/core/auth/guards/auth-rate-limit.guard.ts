import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type { ConfigType } from '@nestjs/config';
import { createHash } from 'crypto';
import type { Request } from 'express';
import Redis from 'ioredis';

import config from '@common/utils/config';
import { LoggingService } from '@core/logs/services/logging.service';
import { readCookie } from '../utils/refresh-cookie.util';

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @Inject(config.KEY)
    private readonly appConfig: ConfigType<typeof config>,
    private readonly loggingService: LoggingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const isLogin = request.path.endsWith('/login');
    const limit = isLogin
      ? this.appConfig.auth.loginRateLimit
      : this.appConfig.auth.refreshRateLimit;
    const windowSeconds = isLogin
      ? this.appConfig.auth.loginRateLimitWindowSeconds
      : this.appConfig.auth.refreshRateLimitWindowSeconds;
    const body = request.body as { email?: unknown } | undefined;
    const subject = isLogin
      ? (typeof body?.email === 'string' ? body.email : '').trim().toLowerCase()
      : (readCookie(
          request.headers.cookie,
          this.appConfig.auth.cookieName,
        )?.split('.', 1)[0] ?? 'missing');
    const keyMaterial = `${request.ip}|${subject}`;
    const fingerprint = createHash('sha256').update(keyMaterial).digest('hex');
    const key = `auth:rate-limit:${isLogin ? 'login' : 'refresh'}:${fingerprint}`;

    const attempts = await this.redis.incr(key);
    if (attempts === 1) await this.redis.expire(key, windowSeconds);

    if (attempts > limit) {
      this.loggingService.warn(
        'Authentication rate limit exceeded',
        this.loggingService.createHttpContext(request),
        { operation: isLogin ? 'login' : 'refresh' },
      );
      throw new HttpException(
        'Demasiados intentos. Inténtelo más tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
