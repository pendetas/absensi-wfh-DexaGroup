import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Memuat file .env ke process.env SEBELUM aplikasi Nest dibuat,
 * supaya main.ts bisa membaca port/host dari environment.
 *
 * Urutan pencarian: `backend/.env` lalu `../.env` (root repo).
 * Variabel yang sudah ada di environment (misalnya dari docker-compose)
 * TIDAK ditimpa, jadi konfigurasi Docker selalu menang.
 */
export function loadEnv(): void {
  for (const file of ['.env', '../.env']) {
    const fullPath = resolve(process.cwd(), file);
    if (existsSync(fullPath)) {
      process.loadEnvFile(fullPath);
      return;
    }
  }
}
