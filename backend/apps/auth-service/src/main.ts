import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { loadEnv } from '@app/common';
import { AuthModule } from './auth.module';

async function bootstrap() {
  loadEnv();
  const port = Number(process.env.AUTH_SERVICE_PORT ?? 4001);

  // TCP only: reachable from the gateway, not from browsers.
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AuthModule, {
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port },
  });

  await app.listen();
  new Logger('AuthService').log(`auth-service listening on TCP port ${port}`);
}
void bootstrap();
