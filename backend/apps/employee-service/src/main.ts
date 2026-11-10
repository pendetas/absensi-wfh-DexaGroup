import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { loadEnv } from '@app/common';
import { EmployeeModule } from './employee.module';

async function bootstrap() {
  loadEnv();
  const port = Number(process.env.EMPLOYEE_SERVICE_PORT ?? 4002);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(EmployeeModule, {
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port },
  });

  await app.listen();
  new Logger('EmployeeService').log(`employee-service listening on TCP port ${port}`);
}
void bootstrap();
