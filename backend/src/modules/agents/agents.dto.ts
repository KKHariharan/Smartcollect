import { z } from 'zod';
import { AGENT_STATUSES } from '../../models/Agent';
import { emailSchema, mobileSchema, objectIdSchema } from '../../utils/validators';

export const createAgentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  mobile: mobileSchema,
  email: emailSchema.optional(),
  area: z.string().trim().max(100).optional(),
  status: z.enum(AGENT_STATUSES).optional(),
  linkedUser: objectIdSchema.optional(),
});
export type CreateAgentDto = z.infer<typeof createAgentSchema>;

export const updateAgentSchema = createAgentSchema.partial();
export type UpdateAgentDto = z.infer<typeof updateAgentSchema>;

export const agentIdParamSchema = z.object({
  id: objectIdSchema,
});

export const listAgentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(AGENT_STATUSES).optional(),
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
