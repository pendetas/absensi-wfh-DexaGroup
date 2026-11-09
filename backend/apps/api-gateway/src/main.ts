import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadEnv } from '@app/common';
import { GatewayModule } from './gateway.module';

async function bootstrap() {
  loadEnv();

  // Gateway = satu-satunya server HTTP. Frontend hanya bicara ke sini.
  const app = await NestFactory.create(GatewayModule);

  app.setGlobalPrefix('api'); // semua route diawali /api
  app.enableCors(); // izinkan frontend (port berbeda) memanggil API

  // Validasi otomatis body request berdasarkan DTO (pengganti validasi manual di Express).
  // whitelist: field yang tidak ada di DTO dibuang, transform: ubah tipe sesuai DTO.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.GATEWAY_PORT ?? 3000);
  await app.listen(port);
  new Logger('Gateway').log(`API gateway berjalan di http://localhost:${port}/api`);
}
void bootstrap();
