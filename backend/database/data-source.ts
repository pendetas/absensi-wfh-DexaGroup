import { DataSource } from 'typeorm';
import { loadEnv } from '@app/common';
import { Attendance } from '../apps/attendance-service/src/entities/attendance.entity';
import { Session } from '../apps/auth-service/src/entities/session.entity';
import { User } from '../apps/auth-service/src/entities/user.entity';
import { Department } from '../apps/employee-service/src/entities/department.entity';
import { Employee } from '../apps/employee-service/src/entities/employee.entity';

loadEnv();

/** Used by the TypeORM CLI (migrations) and the seed script, never by the running services. */
export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  timezone: process.env.APP_TIMEZONE ?? '+07:00',
  entities: [Department, Employee, User, Session, Attendance],
  migrations: [`${__dirname}/migrations/*.{ts,js}`],
  migrationsTableName: 'migrations',
});
