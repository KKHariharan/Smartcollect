import { z } from 'zod';
import { ACCOUNT_TYPES } from '../../models/User';
import {
  emailSchema,
  mobileSchema,
  objectIdSchema,
  strongPasswordSchema,
} from '../../utils/validators';

export const createUserSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: emailSchema,
    mobile: mobileSchema,
    password: strongPasswordSchema,
    confirmPassword: z.string(),
    accountType: z.enum(ACCOUNT_TYPES),
    role: objectIdSchema.optional(),
    organizationId: objectIdSchema.optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .superRefine((data, ctx) => {
    if (data.accountType === 'admin' && !data.role) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'role is required for admin-tier accounts',
        path: ['role'],
      });
    }
  });
export type CreateUserDto = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: emailSchema.optional(),
  mobile: mobileSchema.optional(),
  role: objectIdSchema.optional(),
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
  role: objectIdSchema.optional(),
  organizationId: objectIdSchema.optional(),
  isActive: z.coerce.boolean().optional(),
});
export type ListUsersQueryDto = z.infer<typeof listUsersQuerySchema>;
