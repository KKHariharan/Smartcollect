import { z } from 'zod';
import { ORGANIZATION_STATUSES } from '../../models/Organization';
import { objectIdSchema } from '../../utils/validators';

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(150),
  status: z.enum(ORGANIZATION_STATUSES).optional(),
});
export type CreateOrganizationDto = z.infer<typeof createOrganizationSchema>;

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  status: z.enum(ORGANIZATION_STATUSES).optional(),
});
export type UpdateOrganizationDto = z.infer<typeof updateOrganizationSchema>;

export const organizationIdParamSchema = z.object({
  id: objectIdSchema,
});

export const listOrganizationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(ORGANIZATION_STATUSES).optional(),
});
export type ListOrganizationsQueryDto = z.infer<typeof listOrganizationsQuerySchema>;
