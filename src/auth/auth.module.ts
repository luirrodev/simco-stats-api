import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { AuthController } from './controllers/auth.controller';
import { TokenEntity } from './entities/token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TokenEntity])],
  providers: [AuthService, TokenService],
  controllers: [AuthController],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
