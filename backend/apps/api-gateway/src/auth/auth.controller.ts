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
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  type AccessTokenResult,
  AUTH_PATTERNS,
  AUTH_SERVICE,
  type ClientInfo,
  EMPLOYEE_PATTERNS,
  EMPLOYEE_SERVICE,
  type JwtPayload,
  type SessionResult,
} from '@app/common';
import { AllowPendingPasswordChange } from '../common/decorators/allow-pending-password-change.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { callService } from '../common/service-client';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import {
  clearSessionCookie,
  readSessionCookie,
  setSessionCookie,
  toClientSession,
} from './session-cookie';

const clientInfo = (request: Request): ClientInfo => ({
  userAgent: request.headers['user-agent'],
  ipAddress: request.ip,
});

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
    @Inject(EMPLOYEE_SERVICE) private readonly employeeClient: ClientProxy,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK) // Nest defaults POST to 201; login creates nothing.
  @ApiOperation({ summary: 'Login dengan email atau NIK' })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await callService<SessionResult>(this.authClient, AUTH_PATTERNS.LOGIN, {
      identifier: dto.identifier,
      password: dto.password,
      rememberDevice: dto.rememberDevice ?? false,
      ...clientInfo(request),
    });
    setSessionCookie(response, session);
    return toClientSession(session);
  }

  /** Called by the frontends on load and when the access token expires. */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perbarui access token dari cookie sesi' })
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = readSessionCookie(request);
    if (!refreshToken) throw new UnauthorizedException('Sesi tidak ditemukan, silakan login');
    try {
      const session = await callService<SessionResult>(this.authClient, AUTH_PATTERNS.REFRESH, {
        refreshToken,
        ...clientInfo(request),
      });
      setSessionCookie(response, session);
      return toClientSession(session);
    } catch (error) {
      clearSessionCookie(response);
      throw error;
    }
  }

  // Public: logging out must work even after the access token has expired.
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Akhiri sesi di perangkat ini' })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = readSessionCookie(request);
    if (refreshToken) {
      await callService(this.authClient, AUTH_PATTERNS.LOGOUT, { refreshToken });
    }
    clearSessionCookie(response);
  }

  @AllowPendingPasswordChange()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ganti password; sesi di perangkat lain diakhiri' })
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return callService<AccessTokenResult>(this.authClient, AUTH_PATTERNS.CHANGE_PASSWORD, {
      userId: user.sub,
      sessionId: user.sid,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    });
  }

  /** Account data comes from the token, profile data from employee-service. */
  @AllowPendingPasswordChange()
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil user yang sedang login' })
  async me(@CurrentUser() user: JwtPayload) {
    const employee = await callService(this.employeeClient, EMPLOYEE_PATTERNS.FIND_BY_ID, {
      id: user.employeeId,
    });
    return {
      user: {
        id: user.sub,
        employeeId: user.employeeId,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
      employee,
    };
  }
}
