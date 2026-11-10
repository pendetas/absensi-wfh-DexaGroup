import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags } from '@nestjs/swagger';
import { firstValueFrom, timeout } from 'rxjs';
import {
  ATTENDANCE_PATTERNS,
  ATTENDANCE_SERVICE,
  AUTH_PATTERNS,
  AUTH_SERVICE,
  EMPLOYEE_PATTERNS,
  EMPLOYEE_SERVICE,
} from '@app/common';
import { Public } from '../common/decorators/public.decorator';

type ServiceHealth = { status: string; [key: string]: unknown };

/** Checks that the gateway reaches each service and each service reaches MySQL. */
@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
    @Inject(EMPLOYEE_SERVICE) private readonly employeeClient: ClientProxy,
    @Inject(ATTENDANCE_SERVICE) private readonly attendanceClient: ClientProxy,
  ) {}

  @Get()
  async check() {
    const [auth, employee, attendance] = await Promise.all([
      this.ping(this.authClient, AUTH_PATTERNS.HEALTH),
      this.ping(this.employeeClient, EMPLOYEE_PATTERNS.HEALTH),
      this.ping(this.attendanceClient, ATTENDANCE_PATTERNS.HEALTH),
    ]);
    return { gateway: 'ok', services: { auth, employee, attendance } };
  }

  private async ping(client: ClientProxy, pattern: string): Promise<ServiceHealth> {
    try {
      return await firstValueFrom(client.send<ServiceHealth>(pattern, {}).pipe(timeout(3000)));
    } catch (error) {
      // TCP connection errors such as ECONNREFUSED carry a code but no message.
      const { code, message } = (error ?? {}) as { code?: string; message?: string };
      return { status: 'down', error: message || code || 'Layanan tidak dapat dijangkau' };
    }
  }
}
