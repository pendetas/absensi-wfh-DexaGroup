import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AUTH_PATTERNS,
  AUTH_SERVICE,
  EMPLOYEE_PATTERNS,
  EMPLOYEE_SERVICE,
  type JwtPayload,
  type LoginResult,
} from '@app/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { callService } from '../common/service-client';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
    @Inject(EMPLOYEE_SERVICE) private readonly employeeClient: ClientProxy,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK) // Nest defaults POST to 201; login creates nothing.
  @ApiOperation({ summary: 'Login karyawan / HR' })
  login(@Body() dto: LoginDto) {
    return callService<LoginResult>(this.authClient, AUTH_PATTERNS.LOGIN, dto);
  }

  /** Account data comes from the token, profile data from employee-service. */
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil user yang sedang login' })
  async me(@CurrentUser() user: JwtPayload) {
    const employee = await callService(this.employeeClient, EMPLOYEE_PATTERNS.FIND_BY_ID, {
      id: user.employeeId,
    });
    return {
      user: { id: user.sub, employeeId: user.employeeId, email: user.email, role: user.role },
      employee,
    };
  }
}
