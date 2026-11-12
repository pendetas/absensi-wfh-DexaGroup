import { INestApplication, INestMicroservice, Type } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { createConnection } from 'mysql2/promise';
import { rm } from 'node:fs/promises';
import request from 'supertest';
import type { App } from 'supertest/types';
import { GatewayModule } from '../../apps/api-gateway/src/gateway.module';
import { configureGateway } from '../../apps/api-gateway/src/gateway.setup';
import { AttendanceModule } from '../../apps/attendance-service/src/attendance.module';
import { Clock } from '../../apps/attendance-service/src/clock';
import { AuthModule } from '../../apps/auth-service/src/auth.module';
import { EmployeeModule } from '../../apps/employee-service/src/employee.module';
import dataSource from '../../database/data-source';
import { SEED_PASSWORD, seedSampleData } from '../../scripts/seed';

/** Smallest valid JPEG (1×1 pixel). */
export const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
);

/** A fresh database with the real migrations and the sample employees. */
async function resetDatabase(): Promise<void> {
  const database = process.env.DB_DATABASE!;
  if (!database.endsWith('_test')) throw new Error(`Refusing to reset "${database}"`);

  const connection = await createConnection({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  });
  await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await connection.query(`CREATE DATABASE \`${database}\``);
  await connection.end();

  await dataSource.initialize();
  await dataSource.runMigrations();
  await seedSampleData(dataSource, () => undefined);
  await dataSource.destroy();
}

/**
 * The whole backend in one process: three TCP microservices and the HTTP gateway, wired
 * exactly as in production. Only the attendance clock is replaced, so tests choose the time.
 */
export class TestSystem {
  private services: INestMicroservice[] = [];
  private gateway: INestApplication<App>;
  private now = new Date();

  static async start(): Promise<TestSystem> {
    const system = new TestSystem();
    await resetDatabase();

    await system.startService(AuthModule, 'AUTH_SERVICE_PORT');
    await system.startService(EmployeeModule, 'EMPLOYEE_SERVICE_PORT');
    await system.startService(AttendanceModule, 'ATTENDANCE_SERVICE_PORT');

    const moduleRef = await Test.createTestingModule({ imports: [GatewayModule] }).compile();
    system.gateway = moduleRef.createNestApplication();
    configureGateway(system.gateway);
    await system.gateway.init();
    return system;
  }

  /** Sets "now" for attendance rules, as Jakarta wall-clock time: `2026-11-09 08:30`. */
  setJakartaTime(dateTime: string): void {
    this.now = new Date(`${dateTime.replace(' ', 'T')}:00+07:00`);
  }

  get api() {
    return request(this.gateway.getHttpServer());
  }

  async login(identifier: string, password = SEED_PASSWORD): Promise<string> {
    const response = await this.api.post('/api/auth/login').send({ identifier, password });
    if (response.status !== 200) {
      throw new Error(`Login failed for ${identifier}: ${JSON.stringify(response.body)}`);
    }
    return (response.body as { accessToken: string }).accessToken;
  }

  async stop(): Promise<void> {
    await this.gateway?.close();
    await Promise.all(this.services.map((service) => service.close()));
    await rm(process.env.UPLOAD_DIR!, { recursive: true, force: true });
  }

  private async startService(module: Type<unknown>, portVariable: string): Promise<void> {
    const moduleRef = await Test.createTestingModule({ imports: [module] })
      .overrideProvider(Clock)
      .useValue({ now: () => this.now })
      .compile();
    const service = moduleRef.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: Number(process.env[portVariable]) },
    });
    await service.listen();
    this.services.push(service);
  }
}
