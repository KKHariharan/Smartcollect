import { z } from 'zod';
import { EMI_TYPES } from '../../models/Loan';
import { objectIdSchema } from '../../utils/validators';

export const createLoanSchema = z.object({
  customer: objectIdSchema,
  principalAmount: z.coerce.number().positive(),
  interestRate: z.coerce.number().min(0).max(100),
  totalInstallments: z.coerce.number().int().positive().max(3650),
  emiType: z.enum(EMI_TYPES),
  processingFee: z.coerce.number().min(0).default(0),
  penaltyChargePerDay: z.coerce.number().min(0).default(0),
});
export type CreateLoanDto = z.infer<typeof createLoanSchema>;

export const updateLoanSchema = z.object({
  principalAmount: z.coerce.number().positive().optional(),
  interestRate: z.coerce.number().min(0).max(100).optional(),
  totalInstallments: z.coerce.number().int().positive().max(3650).optional(),
  emiType: z.enum(EMI_TYPES).optional(),
  processingFee: z.coerce.number().min(0).optional(),
  penaltyChargePerDay: z.coerce.number().min(0).optional(),
});
export type UpdateLoanDto = z.infer<typeof updateLoanSchema>;

export const rejectLoanSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});
export type RejectLoanDto = z.infer<typeof rejectLoanSchema>;

export const loanIdParamSchema = z.object({
  id: objectIdSchema,
});

export const listLoansQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  customer: objectIdSchema.optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'active', 'closed']).optional(),
});
export type ListLoansQueryDto = z.infer<typeof listLoansQuerySchema>;
