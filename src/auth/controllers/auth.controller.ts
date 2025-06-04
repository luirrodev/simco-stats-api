import { Controller, Get } from '@nestjs/common';

import { AuthService } from '../services/auth.service';

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
}
