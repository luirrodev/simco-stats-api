import { Controller, Get, Post, Body } from '@nestjs/common';

import { AuthService, AuthCredentials } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint to get CSRF token from external SimComaniesAPI
   * @param apiUrl - Query parameter with the external API URL
   * @returns The CSRF token
   */
  @Get('csrf-token')
  async getCsrfToken() {
    const csrfToken = await this.authService.getCsrfToken();
    return { csrfToken };
  }

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
