import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, ClientsProviderAsyncOptions, Transport } from '@nestjs/microservices';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule, ATTENDANCE_SERVICE, AUTH_SERVICE, EMPLOYEE_SERVICE } from '@app/common';
import { AuthController } from './auth/auth.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { DepartmentsController } from './employees/departments.controller';
import { EmployeesController } from './employees/employees.controller';
import { EmployeesService } from './employees/employees.service';
import { HealthController } from './health/health.controller';

/** Host and port come from env: localhost in dev, the compose service name in Docker. */
function tcpClient(
  name: string,
  envPrefix: string,
  defaultPort: number,
): ClientsProviderAsyncOptions {
  return {
    name,
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      transport: Transport.TCP,
      options: {
        host: config.get<string>(`${envPrefix}_HOST`, 'localhost'),
        port: Number(config.get(`${envPrefix}_PORT`, defaultPort)),
      },
    }),
  };
}

@Module({
  imports: [
    AppConfigModule,
    ClientsModule.registerAsync([
      tcpClient(AUTH_SERVICE, 'AUTH_SERVICE', 4001),
      tcpClient(EMPLOYEE_SERVICE, 'EMPLOYEE_SERVICE', 4002),
      tcpClient(ATTENDANCE_SERVICE, 'ATTENDANCE_SERVICE', 4003),
    ]),
    // The gateway only verifies tokens; auth-service signs them.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ secret: config.getOrThrow<string>('JWT_SECRET') }),
    }),
    // Per-IP default; login and refresh set stricter limits with @Throttle.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
      errorMessage: 'Terlalu banyak percobaan. Silakan tunggu sebentar lalu coba lagi.',
    }),
  ],
  controllers: [HealthController, AuthController, EmployeesController, DepartmentsController],
  providers: [
    EmployeesService,
    // Global guards run in this order: throttling first, and RolesGuard needs request.user.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class GatewayModule {}
