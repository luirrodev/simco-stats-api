import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenEntity } from '../entities/token.entity';

export interface CookieExpirationInfo {
  expirationDate: Date;
  expirationDateLocal: string;
  daysUntilExpiration: number;
  hoursUntilExpiration: number;
  isExpired: boolean;
  maxAge?: number;
}

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(TokenEntity)
    private readonly tokenRepository: Repository<TokenEntity>,
  ) {}

  /**
   * Guarda una nueva cookie en la base de datos
   * @param cookie - La cookie a guardar
   * @returns Promise con la entidad de token guardada
   */
  async saveToken(cookie: string): Promise<TokenEntity> {
    try {
      if (!cookie || cookie.trim() === '') {
        throw new HttpException(
          'Cookie cannot be empty',
          HttpStatus.BAD_REQUEST,
        );
      }

      const tokenEntity = this.tokenRepository.create({
        cookie: cookie,
      });

      return await this.tokenRepository.save(tokenEntity);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to save token: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene el token más reciente de la base de datos
   * @returns Promise con la entidad de token más reciente o null si no existe
   */
  async getLatestToken(): Promise<TokenEntity | null> {
    try {
      const tokens = await this.tokenRepository.find({
        order: {
          createdAt: 'DESC',
        },
      });

      return tokens[0] || null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to retrieve token: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Analiza la expiración de una cookie
   * @param cookie - La cookie a analizar
   * @returns Información de expiración de la cookie
   */
  analyzeCookieExpiration(cookie: string): CookieExpirationInfo {
    try {
      if (!cookie || cookie.trim() === '') {
        throw new HttpException(
          'Cookie cannot be empty',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Buscar la fecha de expiración en la cookie
      const expiresMatch = cookie.match(/Expires=([^;]+)/i);
      const maxAgeMatch = cookie.match(/Max-Age=(\d+)/i);

      let expirationDate: Date;

      if (expiresMatch) {
        // Si hay Expires, usar esa fecha
        expirationDate = new Date(expiresMatch[1]);
      } else if (maxAgeMatch) {
        // Si solo hay Max-Age, calcular la fecha de expiración
        const maxAgeSeconds = parseInt(maxAgeMatch[1], 10);
        expirationDate = new Date(Date.now() + maxAgeSeconds * 1000);
      } else {
        throw new HttpException(
          'Cookie does not contain expiration information',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Verificar que la fecha sea válida
      if (isNaN(expirationDate.getTime())) {
        throw new HttpException(
          'Invalid expiration date in cookie',
          HttpStatus.BAD_REQUEST,
        );
      }

      const now = new Date();
      const timeDifferenceMs = expirationDate.getTime() - now.getTime();

      // Calcular días y horas hasta la expiración
      const daysUntilExpiration = Math.floor(
        timeDifferenceMs / (1000 * 60 * 60 * 24),
      );
      const hoursUntilExpiration = Math.floor(
        timeDifferenceMs / (1000 * 60 * 60),
      );

      // Verificar si ya expiró
      const isExpired = timeDifferenceMs <= 0;

      // Formatear fecha local
      const expirationDateLocal = expirationDate.toLocaleString('es-ES', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const result: CookieExpirationInfo = {
        expirationDate,
        expirationDateLocal,
        daysUntilExpiration: Math.max(0, daysUntilExpiration),
        hoursUntilExpiration: Math.max(0, hoursUntilExpiration),
        isExpired,
      };

      // Agregar Max-Age si está presente
      if (maxAgeMatch) {
        result.maxAge = parseInt(maxAgeMatch[1], 10);
      }

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to analyze cookie expiration: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene información de expiración del token más reciente
   * @returns Promise con información de expiración del token más reciente o null si no existe
   */
  async getLatestTokenExpirationInfo(): Promise<CookieExpirationInfo | null> {
    try {
      const latestToken = await this.getLatestToken();

      if (!latestToken) {
        return null;
      }

      return this.analyzeCookieExpiration(latestToken.cookie);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to get latest token expiration info: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
