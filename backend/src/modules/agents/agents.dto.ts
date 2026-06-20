import { z } from 'zod';
import { AGENT_STATUSES } from '../../models/Agent';
import {
  emailSchema,
  mobileSchema,
  objectIdSchema,
  strongPasswordSchema,
} from '../../utils/validators';

const agentProfileFieldsSchema = z.object({
  name: z.string().trim().min(2).max(100),
  mobile: mobileSchema,
  email: emailSchema,
  area: z.string().trim().max(100).optional(),
  status: z.enum(AGENT_STATUSES).optional(),
});

export const createAgentSchema = agentProfileFieldsSchema
  .extend({
    password: strongPasswordSchema,
    confirmPassword: z.string(),
    organizationId: objectIdSchema.optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type CreateAgentDto = z.infer<typeof createAgentSchema>;

export const updateAgentSchema = agentProfileFieldsSchema.partial();
export type UpdateAgentDto = z.infer<typeof updateAgentSchema>;

export const agentIdParamSchema = z.object({
  id: objectIdSchema,
});

export const listAgentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(AGENT_STATUSES).optional(),
  organizationId: objectIdSchema.optional(),
});
export type ListAgentsQueryDto = z.infer<typeof listAgentsQuerySchema>;

export const assignCustomersSchema = z.object({
  customerIds: z.array(objectIdSchema).min(1),
});
export type AssignCustomersDto = z.infer<typeof assignCustomersSchema>;

export const agentPerformanceQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type AgentPerformanceQueryDto = z.infer<typeof agentPerformanceQuerySchema>;
