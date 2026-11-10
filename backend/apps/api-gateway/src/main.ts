import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { loadEnv } from '@app/common';
import { GatewayModule } from './gateway.module';

async function bootstrap() {
  loadEnv();

  const app = await NestFactory.create(GatewayModule);

  app.setGlobalPrefix('api');
  app.enableCors(); // The React apps are served from other ports.

  // whitelist drops body fields the DTO doesn't declare, e.g. a smuggled "role".
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Dexa - Sistem Absensi WFH')
    .setDescription(
      'API Gateway untuk aplikasi absensi karyawan dan monitoring HR.\n\n' +
        'Cara mencoba: jalankan **POST /api/auth/login**, salin `accessToken`, ' +
        'klik tombol **Authorize**, lalu tempel token tersebut.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, () => SwaggerModule.createDocument(app, swaggerConfig), {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = Number(process.env.GATEWAY_PORT ?? 3000);
  await app.listen(port);
  const logger = new Logger('Gateway');
  logger.log(`API gateway berjalan di http://localhost:${port}/api`);
  logger.log(`Dokumentasi Swagger di http://localhost:${port}/api/docs`);
}
void bootstrap();
