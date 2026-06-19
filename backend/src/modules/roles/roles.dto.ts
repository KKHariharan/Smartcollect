import { z } from 'zod';
import { ALL_PERMISSIONS, PERMISSIONS } from '../../constants/permissions';
import { objectIdSchema } from '../../utils/validators';

const validPermissionValues = new Set<string>([...ALL_PERMISSIONS, PERMISSIONS.WILDCARD]);

const permissionsArraySchema = z
  .array(z.string())
  .refine(
    (permissions) => permissions.every((permission) => validPermissionValues.has(permission)),
    {
      message: 'One or more permissions are invalid',
    },
  );

export const createRoleSchema = z.object({
  name: z.string().trim().min(2).max(50),
  description: z.string().trim().max(250).optional(),
  permissions: permissionsArraySchema.default([]),
});
export type CreateRoleDto = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(50).optional(),
  description: z.string().trim().max(250).optional(),
  permissions: permissionsArraySchema.optional(),
});
export type UpdateRoleDto = z.infer<typeof updateRoleSchema>;

export const roleIdParamSchema = z.object({
  id: objectIdSchema,
});

export const listRolesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
});
export type ListRolesQueryDto = z.infer<typeof listRolesQuerySchema>;
