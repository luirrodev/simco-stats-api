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
   * Calls external API to get CSRF token and cookies
   * @returns Promise with the CSRF token and cookies
   */
  async getCsrfTokenWithCookies() {
    try {
      const response: AxiosResponse<CsrfTokenResponse> = await axios.get(
        API_URL,
        {
          withCredentials: true, // Important: to receive cookies
        },
      );

      if (response.data && response.data.csrfToken) {
        // Extract cookies from response headers
        const cookies = response.headers['set-cookie'] || [];

        return {
          csrfToken: response.data.csrfToken,
          cookies: cookies,
        };
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
  async authenticate(credentials: AuthCredentials) {
    try {
      // First get the CSRF token and cookies
      const { csrfToken, cookies } = await this.getCsrfTokenWithCookies();

      // Prepare headers with CSRF token, referer, and cookies
      const headers = {
        'X-CSRFToken': csrfToken, // Try with capital letters
        'x-csrftoken': csrfToken, // Keep lowercase as backup
        Referer: 'https://www.simcompanies.com/',
        referer: 'https://www.simcompanies.com/',
        Origin: 'https://www.simcompanies.com',
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Cookie: cookies.join('; '), // Send cookies back
      };

      // Make POST request to auth API
      const response: AxiosResponse<any> = await axios.post(
        API_AUTH_URL,
        {
          email: credentials.email,
          password: credentials.password,
          timezone_offset: credentials.timezone_offset,
        },
        {
          headers,
          withCredentials: true, // Important: to send cookies
        },
      );

      if (response.status === 200) {
        return {
          cookie: response.headers['set-cookie'],
        };
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // Log the full error for debugging
      if (axios.isAxiosError(error)) {
        console.error('Axios Error Details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data as unknown,
          headers: error.response?.headers,
        });
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
