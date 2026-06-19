import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { uploadSingleFile } from '../../middleware/upload';
import { PERMISSIONS } from '../../constants/permissions';
import * as customersController from './customers.controller';
import {
  addCustomerNoteSchema,
  createCustomerSchema,
  customerIdParamSchema,
  documentSlotParamSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from './customers.dto';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /customers:
 *   get:
 *     tags: [Customers]
 *     summary: List customers (scoped to assigned customers for Agents, own profile for Customers)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Customers retrieved }
 *   post:
 *     tags: [Customers]
 *     summary: Create a customer profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Customer created }
 */
router.get(
  '/',
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  validate({ query: listCustomersQuerySchema }),
  customersController.listCustomers,
);

router.post(
  '/',
  requirePermission(PERMISSIONS.CUSTOMERS_CREATE),
  validate({ body: createCustomerSchema }),
  customersController.createCustomer,
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  validate({ params: customerIdParamSchema }),
  customersController.getCustomer,
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.CUSTOMERS_UPDATE),
  validate({ params: customerIdParamSchema, body: updateCustomerSchema }),
  customersController.updateCustomer,
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.CUSTOMERS_DELETE),
  validate({ params: customerIdParamSchema }),
  customersController.deleteCustomer,
);

router.post(
  '/:id/notes',
  requirePermission(PERMISSIONS.CUSTOMERS_NOTES, PERMISSIONS.CUSTOMERS_UPDATE),
  validate({ params: customerIdParamSchema, body: addCustomerNoteSchema }),
  customersController.addCustomerNote,
);

router.post(
  '/:id/documents/:slot',
  requirePermission(PERMISSIONS.CUSTOMERS_UPDATE),
  validate({ params: documentSlotParamSchema }),
  uploadSingleFile,
  customersController.uploadCustomerDocument,
);

export default router;
