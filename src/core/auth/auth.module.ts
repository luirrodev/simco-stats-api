import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import config from '@common/utils/config';
import { User } from '../access-control/users/entities/user.entity';
import { LogsModule } from '@core/logs/logs.module';

import { StaffJwtStrategy } from './strategies/staff-jwt.strategy';
import { StaffAuthService } from './services/staff-auth.service';
import { StaffAuthController } from './controllers/staff-auth.controller';
import { AuthSession } from './entities/auth-session.entity';
import { AuthRefreshToken } from './entities/auth-refresh-token.entity';
import { AuthOriginGuard } from './guards/auth-origin.guard';
import { AuthRateLimitGuard } from './guards/auth-rate-limit.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AuthSession, AuthRefreshToken]),
    LogsModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [config.KEY],
      useFactory: (configService: ConfigType<typeof config>) => ({
        secret: configService.jwt.accessTokenSecret,
        signOptions: {
          expiresIn: configService.jwt
            .accessTokenExpiresIn as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [StaffAuthController],
  providers: [
    StaffJwtStrategy,
    StaffAuthService,
    AuthOriginGuard,
    AuthRateLimitGuard,
  ],
  exports: [StaffJwtStrategy, PassportModule],
})
export class AuthModule {}
