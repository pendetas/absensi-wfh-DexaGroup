import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEnv } from '@app/common';

// Runs before any module is imported, so every service reads the test settings below.
loadEnv();

// A separate database, ports and upload folder: e2e runs never touch development data
// and can run while `npm run dev` is up.
process.env.DB_DATABASE = `${process.env.DB_DATABASE ?? 'dexa_absensi'}_test`;
// Root, because the app user only has rights on the development database.
if (process.env.MYSQL_ROOT_PASSWORD) {
  process.env.DB_USERNAME = 'root';
  process.env.DB_PASSWORD = process.env.MYSQL_ROOT_PASSWORD;
}
process.env.AUTH_SERVICE_HOST = '127.0.0.1';
process.env.AUTH_SERVICE_PORT = '4101';
process.env.EMPLOYEE_SERVICE_HOST = '127.0.0.1';
process.env.EMPLOYEE_SERVICE_PORT = '4102';
process.env.ATTENDANCE_SERVICE_HOST = '127.0.0.1';
process.env.ATTENDANCE_SERVICE_PORT = '4103';
process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'dexa-e2e-uploads-'));
process.env.JWT_SECRET ??= 'e2e-secret';
