import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../../models/Expense';
import { objectIdSchema } from '../../utils/validators';

export const createExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.coerce.number().positive(),
  date: z.coerce.date().optional(),
  description: z.string().trim().max(500).optional(),
  organizationId: objectIdSchema.optional(),
});
export type CreateExpenseDto = z.infer<typeof createExpenseSchema>;

export const updateExpenseSchema = createExpenseSchema.omit({ organizationId: true }).partial();
export type UpdateExpenseDto = z.infer<typeof updateExpenseSchema>;

export const expenseIdParamSchema = z.object({
  id: objectIdSchema,
});

export const listExpensesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  organizationId: objectIdSchema.optional(),
});
export type ListExpensesQueryDto = z.infer<typeof listExpensesQuerySchema>;

export const expenseSummaryQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  organizationId: objectIdSchema.optional(),
});
export type ExpenseSummaryQueryDto = z.infer<typeof expenseSummaryQuerySchema>;
