import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';

export interface CsrfTokenResponse {
  csrfToken: string;
}

const API_URL = 'https://www.simcompanies.com/api/csrf/';

@Injectable()
export class AuthService {
  /**
   * Calls external API to get CSRF token
   * @returns Promise with the CSRF token
   */
  async getCsrfToken(): Promise<string> {
    try {
      const response: AxiosResponse<CsrfTokenResponse> =
        await axios.get(API_URL);

      if (response.data && response.data.csrfToken) {
        return response.data.csrfToken;
      }

      throw new HttpException(
        'Invalid response format: csrfToken not found',
        HttpStatus.BAD_GATEWAY,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to fetch CSRF token: ${errorMessage}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
