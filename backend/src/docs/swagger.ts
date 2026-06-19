import swaggerJsdoc from 'swagger-jsdoc';
import { env, isProduction } from '../config/env';

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Finance Collection Management System API',
      version: '1.0.0',
      description: 'REST API for the Finance Collection Management System (Phase 1: Auth & RBAC)',
    },
    servers: [{ url: env.API_PREFIX }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [isProduction ? './dist/modules/**/*.routes.js' : './src/modules/**/*.routes.ts'],
});

export default swaggerSpec;
