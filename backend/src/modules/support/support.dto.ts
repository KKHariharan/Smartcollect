import { z } from 'zod';
import { TICKET_STATUSES } from '../../models/SupportTicket';
import { objectIdSchema } from '../../utils/validators';

export const createTicketSchema = z.object({
  customer: objectIdSchema,
  subject: z.string().trim().min(2).max(200),
  description: z.string().trim().min(1).max(2000),
});
export type CreateTicketDto = z.infer<typeof createTicketSchema>;

export const updateTicketStatusSchema = z.object({
  status: z.enum(TICKET_STATUSES),
});
export type UpdateTicketStatusDto = z.infer<typeof updateTicketStatusSchema>;

export const addTicketMessageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});
export type AddTicketMessageDto = z.infer<typeof addTicketMessageSchema>;

export const ticketIdParamSchema = z.object({
  id: objectIdSchema,
});

export const listTicketsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(TICKET_STATUSES).optional(),
  customer: objectIdSchema.optional(),
});
export type ListTicketsQueryDto = z.infer<typeof listTicketsQuerySchema>;
