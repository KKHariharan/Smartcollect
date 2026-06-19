import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import type { Express } from 'express';
import { env } from '../config/env';

export function applySecurityMiddleware(app: Express): void {
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
      credentials: true,
    }),
  );
  app.use(hpp());
  app.use(
    mongoSanitize({
      replaceWith: '_',
    }),
  );
}
