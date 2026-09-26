import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';

import { Strategy, ExtractJwt } from 'passport-jwt';

import config from 'src/config';
import { PayloadToken } from '../models/payload.token';
@Injectable()
export class JwtStrategyService extends PassportStrategy(Strategy, 'jwt') {
  private readonly configService: ConfigType<typeof config>;

  constructor(@Inject(config.KEY) configService: ConfigType<typeof config>) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.jwt.accessTokenSecret,
    });
    this.configService = configService;
  }

  validate(payload: PayloadToken) {
    return payload;
  }
}
