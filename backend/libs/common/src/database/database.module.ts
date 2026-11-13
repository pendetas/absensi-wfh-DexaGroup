import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

/**
 * All services share one MySQL server, but each registers only its own tables via forFeature().
 * Another service's data is fetched over TCP, never queried directly.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get('DB_PORT', 3306)),
        username: config.getOrThrow<string>('DB_USERNAME'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.getOrThrow<string>('DB_DATABASE'),
        // Matches the MySQL server timezone (WIB).
        timezone: config.get<string>('APP_TIMEZONE', '+07:00'),
        // Calendar days stay "YYYY-MM-DD"; as Date objects they shift a day on a host outside WIB.
        dateStrings: ['DATE'],
        autoLoadEntities: true,
        // Schema changes go through migrations (npm run db:migrate), never auto-sync.
        synchronize: false,
        retryAttempts: 10,
        retryDelay: 3000,
      }),
    }),
  ],
})
export class DatabaseModule {}
