import { z } from 'zod';

export const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain a special character');

export const emailSchema = z.string().trim().toLowerCase().email('Invalid email address');

export const mobileSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits');

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier format');
