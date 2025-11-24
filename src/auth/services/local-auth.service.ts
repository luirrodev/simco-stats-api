import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { UsersService } from '../../users/services/users.service';
import { UserEntity } from 'src/users/entities/user.entity';
import { PayloadToken } from '../models/payload.token';

@Injectable()
export class LocalAuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    const isMatch = await bcrypt.compare(password, user.password);

    if (user && isMatch) {
      return user;
    }

    return null;
  }

  generateJWT(user: UserEntity) {
    const payload: PayloadToken = { role: user.role, sub: user.id };

    const access_token = this.jwtService.sign({ ...payload }, {
      expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
    } as any);

    const refresh_token = this.jwtService.sign(
      { ...payload } as Record<string, any>,
      {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
        expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
      } as any,
    );

    return {
      access_token,
      refresh_token,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<PayloadToken>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      } as any);

      const user = await this.userService.findOne(payload.sub);
      if (!user) {
        return null;
      }

      const newPayload: PayloadToken = { role: user.role, sub: user.id };
      const access_token = this.jwtService.sign(
        { ...newPayload } as Record<string, any>,
        {
          expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
        } as any,
      );

      return {
        access_token,
      };
    } catch {
      return null;
    }
  }
}
