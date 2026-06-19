import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { PERMISSIONS } from '../../constants/permissions';
import * as loansController from './loans.controller';
import {
  createLoanSchema,
  listLoansQuerySchema,
  loanIdParamSchema,
  rejectLoanSchema,
  updateLoanSchema,
} from './loans.dto';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.LOANS_READ),
  validate({ query: listLoansQuerySchema }),
  loansController.listLoans,
);

router.post(
  '/',
  requirePermission(PERMISSIONS.LOANS_CREATE),
  validate({ body: createLoanSchema }),
  loansController.createLoan,
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.LOANS_READ),
  validate({ params: loanIdParamSchema }),
  loansController.getLoan,
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.LOANS_UPDATE),
  validate({ params: loanIdParamSchema, body: updateLoanSchema }),
  loansController.updateLoan,
);

router.post(
  '/:id/approve',
  requirePermission(PERMISSIONS.LOANS_APPROVE),
  validate({ params: loanIdParamSchema }),
  loansController.approveLoan,
);

router.post(
  '/:id/reject',
  requirePermission(PERMISSIONS.LOANS_APPROVE),
  validate({ params: loanIdParamSchema, body: rejectLoanSchema }),
  loansController.rejectLoan,
);

router.post(
  '/:id/close',
  requirePermission(PERMISSIONS.LOANS_UPDATE),
  validate({ params: loanIdParamSchema }),
  loansController.closeLoan,
);

router.get(
  '/:id/emi-schedule',
  requirePermission(PERMISSIONS.LOANS_READ),
  validate({ params: loanIdParamSchema }),
  loansController.getEmiSchedule,
);

export default router;
