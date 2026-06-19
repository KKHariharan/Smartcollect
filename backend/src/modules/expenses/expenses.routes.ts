import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { PERMISSIONS } from '../../constants/permissions';
import * as expensesController from './expenses.controller';
import {
  createExpenseSchema,
  expenseIdParamSchema,
  expenseSummaryQuerySchema,
  listExpensesQuerySchema,
  updateExpenseSchema,
} from './expenses.dto';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.EXPENSES_READ),
  validate({ query: listExpensesQuerySchema }),
  expensesController.listExpenses,
);

router.post(
  '/',
  requirePermission(PERMISSIONS.EXPENSES_CREATE),
  validate({ body: createExpenseSchema }),
  expensesController.createExpense,
);

router.get(
  '/summary',
  requirePermission(PERMISSIONS.EXPENSES_READ),
  validate({ query: expenseSummaryQuerySchema }),
  expensesController.getExpenseSummary,
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.EXPENSES_READ),
  validate({ params: expenseIdParamSchema }),
  expensesController.getExpense,
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.EXPENSES_UPDATE),
  validate({ params: expenseIdParamSchema, body: updateExpenseSchema }),
  expensesController.updateExpense,
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.EXPENSES_DELETE),
  validate({ params: expenseIdParamSchema }),
  expensesController.deleteExpense,
);

export default router;
