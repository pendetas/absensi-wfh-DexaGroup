import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { loadEnv } from '@app/common';
import { GatewayModule } from './gateway.module';

async function bootstrap() {
  loadEnv();

  const app = await NestFactory.create(GatewayModule);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  // Credentials are allowed so the session cookie works, which requires an explicit origin list.
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  // whitelist drops body fields the DTO doesn't declare, e.g. a smuggled "role".
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Dexa WFH Attendance API')
    .setDescription(
      'API gateway for the employee attendance app and the HR monitoring app.\n\n' +
        'To try it: call **POST /api/auth/login** (e.g. `hr@dexa.test` / `Password123!`), ' +
        'copy `accessToken`, click **Authorize** and paste it.',
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
  logger.log(`API gateway on http://localhost:${port}/api`);
  logger.log(`Swagger docs on http://localhost:${port}/api/docs`);
}
void bootstrap();
