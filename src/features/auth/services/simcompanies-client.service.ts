import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosHeaders } from 'axios';
import type { AxiosRequestConfig, RawAxiosHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';

import { SimCompaniesSessionService } from './simcompanies-session.service';

@Injectable()
export class SimCompaniesClient {
  constructor(
    private readonly httpService: HttpService,
    private readonly sessionService: SimCompaniesSessionService,
  ) {}

  async get<T>(url: string, options: AxiosRequestConfig = {}): Promise<T> {
    try {
      return await this.request<T>(url, options);
    } catch (error) {
      if (!this.isAuthenticationFailure(error)) throw error;
      await this.sessionService.invalidate();
      return this.request<T>(url, options);
    }
  }

  private async request<T>(
    url: string,
    options: AxiosRequestConfig,
  ): Promise<T> {
    const cookie = await this.sessionService.getValidCookie();
    const headers = AxiosHeaders.from(
      options.headers as unknown as RawAxiosHeaders | undefined,
    );
    headers.set(this.sessionService.getRequestHeaders(cookie));
    const response = await firstValueFrom(
      this.httpService.get<T>(url, {
        ...options,
        headers,
      }),
    );
    return response.data;
  }

  private isAuthenticationFailure(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('response' in error)) {
      return false;
    }
    const response = (error as { response?: { status?: number } }).response;
    return response?.status === 401 || response?.status === 403;
  }
}
