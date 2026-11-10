import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, ClientsProviderAsyncOptions, Transport } from '@nestjs/microservices';
import { AppConfigModule, ATTENDANCE_SERVICE, AUTH_SERVICE, EMPLOYEE_SERVICE } from '@app/common';
import { AuthController } from './auth/auth.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { EmployeesController } from './employees/employees.controller';
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
  ],
  controllers: [HealthController, AuthController, EmployeesController],
  providers: [
    // Global guards run in this order: RolesGuard needs request.user from JwtAuthGuard.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class GatewayModule {}
