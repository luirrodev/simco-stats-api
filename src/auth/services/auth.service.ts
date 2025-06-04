import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';

export interface CsrfTokenResponse {
  csrfToken: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
  timezone_offset: number;
}

export interface AuthResponse {
  headers: Record<string, string>;
}

const API_URL = 'https://www.simcompanies.com/api/csrf/';
const API_AUTH_URL = 'https://www.simcompanies.com/api/v2/auth/email/auth/';

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

  /**
   * Calls external API to authenticate user
   * @param credentials - The authentication credentials
   * @returns Promise with the authentication response
   */
  async authenticate(credentials: AuthCredentials): Promise<AuthResponse> {
    try {
      // First get the CSRF token
      const csrfToken = await this.getCsrfToken();

      // Prepare headers with CSRF token and referer
      const headers = {
        'x-csrftoken': csrfToken,
        referer: 'https://www.simcompanies.com/',
        'Content-Type': 'application/json',
      };

      // Make POST request to auth API
      const response: AxiosResponse<any> = await axios.post(
        API_AUTH_URL,
        {
          email: credentials.email,
          password: credentials.password,
          timezone_offset: credentials.timezone_offset,
        },
        { headers },
      );

      // Return all headers as JSON
      return {
        headers: response.headers as Record<string, string>,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Authentication failed: ${errorMessage}`,
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
