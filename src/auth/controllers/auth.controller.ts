import { Controller, Post, Body } from '@nestjs/common';

import { AuthService, AuthCredentials } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint to authenticate user with SimCompanies API
   * @param credentials - Body with email, password and timezone_offset
   * @returns Authentication response headers
   */
  @Post('authenticate')
  async authenticate(@Body() credentials: AuthCredentials) {
    return await this.authService.authenticate(credentials);
  }
}
