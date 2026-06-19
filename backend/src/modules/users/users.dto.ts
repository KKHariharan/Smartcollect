import { z } from 'zod';
import { ACCOUNT_TYPES } from '../../models/User';
import {
  emailSchema,
  mobileSchema,
  objectIdSchema,
  strongPasswordSchema,
} from '../../utils/validators';

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  mobile: mobileSchema,
  password: strongPasswordSchema,
  role: objectIdSchema,
  accountType: z.enum(ACCOUNT_TYPES),
});
export type CreateUserDto = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: emailSchema.optional(),
  mobile: mobileSchema.optional(),
  role: objectIdSchema.optional(),
  accountType: z.enum(ACCOUNT_TYPES).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateUserDto = z.infer<typeof updateUserSchema>;

export const userIdParamSchema = z.object({
  id: objectIdSchema,
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  accountType: z.enum(ACCOUNT_TYPES).optional(),
  isActive: z.coerce.boolean().optional(),
});
export type ListUsersQueryDto = z.infer<typeof listUsersQuerySchema>;
