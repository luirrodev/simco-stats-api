import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { TokenService } from './token.service';
import { ConfigType } from '@nestjs/config';
import config from 'src/config';

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

export interface ValidCookieResponse {
  cookie: string;
  isNewCookie: boolean;
  expirationInfo: {
    daysUntilExpiration: number;
    expirationDateLocal: string;
    isExpired: boolean;
  };
}

const API_URL = 'https://www.simcompanies.com/api/csrf/';
const API_AUTH_URL = 'https://www.simcompanies.com/api/v2/auth/email/auth/';

// Configuración del servicio
const COOKIE_RENEWAL_THRESHOLD_DAYS = 5; // Renovar si quedan 5 días o menos

@Injectable()
export class AuthService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigType<typeof config>, // Asegúrate de importar ConfigService si lo usas
  ) {}
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
   * Autentica al usuario con la API externa de SimCompanies.
   * Guarda automáticamente la cookie de sesión en la base de datos.
   *
   * @returns Promise con mensaje de confirmación de autenticación exitosa
   *
   * @throws HttpException - Si falla la autenticación o hay errores de red
   * await authService.authenticate(credentials);   * ```
   */
  async authenticate() {
    try {
      // First get the CSRF token and cookies
      const { csrfToken, cookies } = await this.getCsrfTokenWithCookies();

      // Get credentials from environment variables
      const credentials: AuthCredentials = {
        email: this.configService.credentials.email || '',
        password: this.configService.credentials.password || '',
        timezone_offset:
          Number(this.configService.credentials.timezone_offset) || 0,
      };

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
        const cookie = response.headers['set-cookie'];

        // Guardar la cookie en la base de datos si existe
        if (cookie && cookie.length > 0) {
          const cookieString = Array.isArray(cookie)
            ? cookie.join('; ')
            : cookie;
          await this.tokenService.saveToken(cookieString);
        }

        return {
          message: 'Authentication successful',
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

  /**
   * Verifica si la cookie actual es válida (más de 5 días para expirar).
   * Si no es válida o está próxima a expirar, autentica de nuevo y obtiene una nueva cookie.
   * @returns Promise con información de la cookie válida
   */
  async ensureValidCookie(): Promise<ValidCookieResponse> {
    try {
      // Obtener información de expiración del token más reciente
      const tokenExpirationInfo =
        await this.tokenService.getLatestTokenExpirationInfo();

      let shouldRenewCookie = true;
      let currentCookie: string | null = null;

      if (tokenExpirationInfo) {
        const { daysUntilExpiration, isExpired } = tokenExpirationInfo;

        // Verificar si la cookie tiene más de 5 días para expirar y no está expirada
        if (!isExpired && daysUntilExpiration > COOKIE_RENEWAL_THRESHOLD_DAYS) {
          shouldRenewCookie = false;
          const latestToken = await this.tokenService.getLatestToken();
          currentCookie = latestToken?.cookie || null;
        }
      }

      if (shouldRenewCookie || !currentCookie) {
        // La cookie está próxima a expirar, expirada, o no existe
        // Hacer nueva autenticación
        await this.authenticate();

        // Obtener la nueva cookie recién guardada
        const newTokenInfo =
          await this.tokenService.getLatestTokenExpirationInfo();

        if (!newTokenInfo) {
          throw new HttpException(
            'Failed to obtain new authentication token',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }

        const newToken = await this.tokenService.getLatestToken();

        return {
          cookie: newToken?.cookie || '',
          isNewCookie: true,
          expirationInfo: {
            daysUntilExpiration: newTokenInfo.daysUntilExpiration,
            expirationDateLocal: newTokenInfo.expirationDateLocal,
            isExpired: newTokenInfo.isExpired,
          },
        };
      }

      // La cookie actual es válida
      return {
        cookie: currentCookie,
        isNewCookie: false,
        expirationInfo: {
          daysUntilExpiration: tokenExpirationInfo!.daysUntilExpiration,
          expirationDateLocal: tokenExpirationInfo!.expirationDateLocal,
          isExpired: tokenExpirationInfo!.isExpired,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to ensure valid cookie: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene una cookie válida para uso inmediato.
   * Verifica la cookie actual y la renueva automáticamente si es necesario.
   * @returns Promise con la cookie válida como string
   */
  async getValidCookie(): Promise<string> {
    const validCookieResponse = await this.ensureValidCookie();
    return validCookieResponse.cookie;
  }
}
