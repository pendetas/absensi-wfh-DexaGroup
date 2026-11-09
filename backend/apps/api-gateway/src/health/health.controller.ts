import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
  ATTENDANCE_PATTERNS,
  ATTENDANCE_SERVICE,
  AUTH_PATTERNS,
  AUTH_SERVICE,
  EMPLOYEE_PATTERNS,
  EMPLOYEE_SERVICE,
} from '@app/common';

/**
 * GET /api/health
 * Mengecek apakah gateway bisa menjangkau setiap microservice,
 * dan apakah setiap service bisa menjangkau MySQL.
 */
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

  private async ping(client: ClientProxy, pattern: string) {
    try {
      // client.send() mengembalikan Observable (RxJS); firstValueFrom mengubahnya jadi Promise.
      return await firstValueFrom(client.send(pattern, {}).pipe(timeout(3000)));
    } catch (error) {
      return { status: 'down', error: error instanceof Error ? error.message : String(error) };
    }
  }
}
