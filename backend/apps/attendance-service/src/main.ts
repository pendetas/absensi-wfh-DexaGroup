import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { loadEnv } from '@app/common';
import { AttendanceModule } from './attendance.module';

async function bootstrap() {
  loadEnv();
  const port = Number(process.env.ATTENDANCE_SERVICE_PORT ?? 4003);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AttendanceModule, {
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port },
  });

  await app.listen();
  new Logger('AttendanceService').log(`attendance-service mendengarkan di TCP port ${port}`);
}
void bootstrap();
