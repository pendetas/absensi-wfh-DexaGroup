import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Runs before Nest boots so main.ts can read ports. Checks backend/.env, then the repo root.
 * Variables already set (e.g. by docker-compose) are not overwritten.
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
