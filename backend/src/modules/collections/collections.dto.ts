import { z } from 'zod';
import { PAYMENT_MODES } from '../../models/Collection';
import { objectIdSchema } from '../../utils/validators';

export const createCollectionSchema = z.object({
  customer: objectIdSchema,
  loan: objectIdSchema,
  amount: z.coerce.number().positive(),
  paymentMode: z.enum(PAYMENT_MODES),
  collectionDate: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional(),
});
export type CreateCollectionDto = z.infer<typeof createCollectionSchema>;

export const collectionIdParamSchema = z.object({
  id: objectIdSchema,
});

export const listCollectionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  customer: objectIdSchema.optional(),
  loan: objectIdSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type ListCollectionsQueryDto = z.infer<typeof listCollectionsQuerySchema>;

export const listPendingQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  overdueOnly: z.coerce.boolean().default(false),
});
export type ListPendingQueryDto = z.infer<typeof listPendingQuerySchema>;
