import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

/** HTTP behaviour shared by main.ts and the e2e tests, so tests exercise the real pipeline. */
export function configureGateway(app: INestApplication): void {
  // Behind nginx every request comes from the proxy; without this, all users share one rate limit.
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) {
    const hops = Number(trustProxy);
    (app.getHttpAdapter().getInstance() as { set(key: string, value: unknown): void }).set(
      'trust proxy',
      Number.isNaN(hops) ? trustProxy : hops,
    );
  }

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
