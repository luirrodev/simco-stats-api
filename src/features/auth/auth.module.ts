import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './services/auth.service';
import { LocalAuthService } from './services/local-auth.service';
import { TokenService } from './services/token.service';
import { AuthController } from './controllers/auth.controller';
import { TokenEntity } from './entities/token.entity';
import { JwtStrategyService } from './strategies/jwt.strategy.service';
import { LocalStrategyService } from './strategies/local.strategy.service';
import { JWTAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TokenEntity]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          secret:
            configService.get<string>('JWT_ACCESS_SECRET') || 'default-secret',
          signOptions: {
            expiresIn: '1h',
          },
        };
      },
      inject: [ConfigService],
    }),
    UsersModule,
  ],
  providers: [
    AuthService,
    LocalAuthService,
    TokenService,
    JwtStrategyService,
    LocalStrategyService,
    JWTAuthGuard,
    LocalAuthGuard,
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    LocalAuthService,
    TokenService,
    JWTAuthGuard,
    LocalAuthGuard,
  ],
})
export class AuthModule {}
