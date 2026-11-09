import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, ClientsProviderAsyncOptions, Transport } from '@nestjs/microservices';
import { AppConfigModule, ATTENDANCE_SERVICE, AUTH_SERVICE, EMPLOYEE_SERVICE } from '@app/common';
import { HealthController } from './health/health.controller';

/**
 * Membuat koneksi TCP (ClientProxy) ke satu microservice.
 * Host & port dibaca dari env, sehingga sama-sama jalan di laptop (localhost)
 * maupun di Docker (nama service, mis. "auth-service").
 */
function tcpClient(name: string, envPrefix: string, defaultPort: number): ClientsProviderAsyncOptions {
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
  ],
  controllers: [HealthController],
})
export class GatewayModule {}
