import { Controller, Post, Get } from '@nestjs/common';

import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

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
