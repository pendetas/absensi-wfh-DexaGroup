import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

/** HTTP behaviour shared by main.ts and the e2e tests, so tests exercise the real pipeline. */
export function configureGateway(app: INestApplication): void {
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
}
