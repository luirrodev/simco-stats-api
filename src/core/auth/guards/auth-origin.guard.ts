import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Request } from 'express';

import config from '@common/utils/config';

@Injectable()
export class AuthOriginGuard implements CanActivate {
  constructor(
    @Inject(config.KEY)
    private readonly appConfig: ConfigType<typeof config>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.appConfig.auth.cookieSameSite !== 'none') return true;

    const request = context.switchToHttp().getRequest<Request>();
    if (request.get('origin') !== this.appConfig.auth.frontendOrigin) {
      throw new ForbiddenException('Origen no permitido');
    }

    return true;
  }
}
