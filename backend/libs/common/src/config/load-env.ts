import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

/**
 * Runs before Nest boots so main.ts can read ports. Checks backend/.env, then the repo root.
 * Variables already set (e.g. by docker-compose) are not overwritten.
 */
export function loadEnv(): void {
  for (const file of ['.env', '../.env']) {
    const fullPath = resolve(process.cwd(), file);
    if (existsSync(fullPath)) {
      // Assigned by hand rather than with process.loadEnvFile(), which bypasses the
      // process.env copy that Jest gives each test file.
      for (const [key, value] of Object.entries(parseEnv(readFileSync(fullPath, 'utf8')))) {
        process.env[key] ??= value;
      }
      return;
    }
  }
}
