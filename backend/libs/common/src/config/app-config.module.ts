import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

/** ignoreEnvFile: loadEnv() in each main.ts has already loaded .env into process.env. */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true })],
})
export class AppConfigModule {}
