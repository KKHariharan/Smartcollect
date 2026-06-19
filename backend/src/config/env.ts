import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:4200'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  SEED_ADMIN_NAME: z.string().default('System Admin'),
  // SEED_ADMIN_EMAIL: z.string().email().default('admin@financecollection.local'),
  // SEED_ADMIN_PASSWORD: z.string().min(8).default('ChangeMe@123'),
  // SEED_ADMIN_MOBILE: z.string().default('9999999999'),
  SEED_ADMIN_EMAIL: z.string().email().default('kathavarayanhariharan@gmail.com'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('Hari@2026'),
  SEED_ADMIN_MOBILE: z.string().default('9999999999'),

  EMAIL_PROVIDER: z.enum(['console']).default('console'),
  EMAIL_FROM: z.string().default('no-reply@financecollection.local'),

  RESET_PASSWORD_TOKEN_EXPIRES_IN: z.string().default('15m'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
