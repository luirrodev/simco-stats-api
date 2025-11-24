import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

import { Strategy } from 'passport-local';
import { LocalAuthService } from '../services/local-auth.service';

@Injectable()
export class LocalStrategyService extends PassportStrategy(Strategy, 'local') {
  private readonly authService: LocalAuthService;

  constructor(authService: LocalAuthService) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
    this.authService = authService;
  }

  async validate(email: string, password: string) {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Wrong password');
    }
    return user;
  }
}
