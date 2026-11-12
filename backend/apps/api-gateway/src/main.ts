import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { loadEnv } from '@app/common';
import { GatewayModule } from './gateway.module';
import { configureGateway } from './gateway.setup';

async function bootstrap() {
  loadEnv();

  const app = await NestFactory.create(GatewayModule);
  configureGateway(app);

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
