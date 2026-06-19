import express, { type Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { applySecurityMiddleware } from './middleware/security';
import { globalRateLimiter } from './middleware/rate-limit';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import swaggerSpec from './docs/swagger';
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import rolesRoutes from './modules/roles/roles.routes';
import customersRoutes from './modules/customers/customers.routes';
import agentsRoutes from './modules/agents/agents.routes';
import loansRoutes from './modules/loans/loans.routes';
import collectionsRoutes from './modules/collections/collections.routes';
import expensesRoutes from './modules/expenses/expenses.routes';
import supportRoutes from './modules/support/support.routes';
import settingsRoutes from './modules/settings/settings.routes';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  applySecurityMiddleware(app);
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(globalRateLimiter);

  app.get('/health', (_req, res) => {
    res.status(200).json({ success: true, message: 'OK', data: { uptime: process.uptime() } });
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  const apiRouter = express.Router();
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/users', usersRoutes);
  apiRouter.use('/roles', rolesRoutes);
  apiRouter.use('/customers', customersRoutes);
  apiRouter.use('/agents', agentsRoutes);
  apiRouter.use('/loans', loansRoutes);
  apiRouter.use('/collections', collectionsRoutes);
  apiRouter.use('/expenses', expensesRoutes);
  apiRouter.use('/support-tickets', supportRoutes);
  apiRouter.use('/settings', settingsRoutes);
  app.use(env.API_PREFIX, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
