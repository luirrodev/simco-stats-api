import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@common/types/jwt.payload';

import {
  AccessTokenResponse,
  StaffAuthService,
} from '../services/staff-auth.service';
import { EmptyAuthDto, LoginDto } from '../dto/login.dto';
import { StaffProfileDto } from '../dto/profile.dto';
import { StaffJwtAuthGuard } from '../guards/staff-jwt-auth.guard';
import { AuthOriginGuard } from '../guards/auth-origin.guard';
import { AuthRateLimitGuard } from '../guards/auth-rate-limit.guard';
import {
  clearRefreshCookieOptions,
  readCookie,
  refreshCookieOptions,
} from '../utils/refresh-cookie.util';
import config from '@common/utils/config';
import type { ConfigType } from '@nestjs/config';

@ApiTags('auth')
@Controller({ path: 'auth/staff' })
export class StaffAuthController {
  constructor(
    private readonly staffAuthService: StaffAuthService,
    @Inject(config.KEY)
    private readonly appConfig: ConfigType<typeof config>,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthRateLimitGuard, AuthOriginGuard)
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AccessTokenResponse> {
    const tokens = await this.staffAuthService.login(
      loginDto.email,
      loginDto.password,
      request,
    );
    response.cookie(
      this.appConfig.auth.cookieName,
      tokens.refreshToken,
      refreshCookieOptions(this.appConfig),
    );
    return { accessToken: tokens.accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthRateLimitGuard, AuthOriginGuard)
  async refresh(
    @Body() _body: EmptyAuthDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AccessTokenResponse> {
    const tokens = await this.staffAuthService.refresh(
      readCookie(request.headers.cookie, this.appConfig.auth.cookieName),
      request,
    );
    response.cookie(
      this.appConfig.auth.cookieName,
      tokens.refreshToken,
      refreshCookieOptions(this.appConfig),
    );
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthOriginGuard)
  async logout(
    @Body() _body: EmptyAuthDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.staffAuthService.logout(
      readCookie(request.headers.cookie, this.appConfig.auth.cookieName),
      request,
    );
    response.clearCookie(
      this.appConfig.auth.cookieName,
      clearRefreshCookieOptions(this.appConfig),
    );
  }

  @Get('profile')
  @ApiBearerAuth()
  @UseGuards(StaffJwtAuthGuard)
  profile(@CurrentUser() user: AuthenticatedUser): StaffProfileDto {
    return {
      firstName: user.firstName,
      secondName: user.secondName,
      lastName: user.lastName,
      secondLastName: user.secondLastName,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    };
  }
}
