import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

/**
 * ConfigModule global: semua service bisa inject `ConfigService`
 * untuk membaca environment variable.
 *
 * `ignoreEnvFile: true` karena file .env sudah dimuat oleh `loadEnv()` di main.ts
 * (satu mekanisme saja, supaya tidak membingungkan).
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true })],
})
export class AppConfigModule {}
