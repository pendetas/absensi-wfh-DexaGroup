import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

/**
 * Koneksi MySQL via TypeORM, dipakai oleh setiap microservice yang butuh database.
 *
 * Catatan arsitektur: semua service memakai satu server MySQL yang sama,
 * tetapi setiap service hanya mendaftarkan dan mengakses tabel MILIKNYA sendiri
 * (lewat `TypeOrmModule.forFeature([...])` di module service tersebut).
 * Data milik service lain diambil dengan memanggil service itu, bukan query langsung.
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
        // Simpan & baca DATETIME dalam WIB, sama dengan zona waktu server MySQL.
        timezone: config.get<string>('APP_TIMEZONE', '+07:00'),
        // Entity yang didaftarkan lewat forFeature() otomatis ikut dimuat.
        autoLoadEntities: true,
        // true hanya untuk development: tabel dibuat/diubah otomatis dari entity.
        synchronize: config.get<string>('DB_SYNCHRONIZE') === 'true',
        retryAttempts: 10,
        retryDelay: 3000,
      }),
    }),
  ],
})
export class DatabaseModule {}
