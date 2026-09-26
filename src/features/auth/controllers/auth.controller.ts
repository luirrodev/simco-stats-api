import {
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  Body,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthService } from '../services/auth.service';
import { LocalAuthService } from '../services/local-auth.service';
import { TokenService } from '../services/token.service';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { RegisterDto } from '../dtos/register.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { UsersService } from '../../users/services/users.service';
import { UserEntity } from '../../users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly localAuthService: LocalAuthService,
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Endpoint to register a new user
   * @returns Created user and JWT token
   */
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    return this.localAuthService.generateJWT(user);
  }

  /**
   * Endpoint to login with email and password
   * @returns JWT access token, refresh token and user information
   */
  @Post('login')
  @UseGuards(LocalAuthGuard)
  login(@Request() req: { user: UserEntity }) {
    return this.localAuthService.generateJWT(req.user);
  }

  /**
   * Endpoint to refresh access token using refresh token
   * @returns New JWT access token
   */
  @Post('refresh')
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.localAuthService.refreshAccessToken(
      refreshTokenDto.refresh_token,
    );

    if (!result) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return result;
  }

  /**
   * Endpoint to authenticate user with SimCompanies API
   * @returns Authentication response headers
   */
  @Post('authenticate')
  async authenticate() {
    return await this.authService.authenticate();
  }

  /**
   * Endpoint to retrieve the latest authentication token expiration information
   * @returns Token expiration details including expiry date and remaining time
   */
  @Get('latest-token-info')
  async getLatestTokenInfo() {
    return await this.tokenService.getLatestTokenExpirationInfo();
  }
}
