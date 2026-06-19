import type { Server } from 'node:http';
import { createApp } from './app';
import { connectDB, disconnectDB } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';

async function bootstrap(): Promise<void> {
  await connectDB();

  const app = createApp();
  const server: Server = app.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`API docs available at http://localhost:${env.PORT}/api-docs`);
  });

  const shutdown = (signal: string): void => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      disconnectDB()
        .then(() => {
          logger.info('Shutdown complete');
          process.exit(0);
        })
        .catch((err: unknown) => {
          logger.error('Error during shutdown', { err });
          process.exit(1);
        });
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason });
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { err });
    process.exit(1);
  });
}

bootstrap().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', err);
  process.exit(1);
});
