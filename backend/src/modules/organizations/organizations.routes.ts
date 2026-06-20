import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { requireAccountType } from '../../middleware/account-type';
import { validate } from '../../middleware/validate';
import { PERMISSIONS } from '../../constants/permissions';
import * as organizationsController from './organizations.controller';
import {
  createOrganizationSchema,
  listOrganizationsQuerySchema,
  organizationIdParamSchema,
  updateOrganizationSchema,
} from './organizations.dto';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.ORGANIZATIONS_READ),
  validate({ query: listOrganizationsQuerySchema }),
  organizationsController.listOrganizations,
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.ORGANIZATIONS_READ),
  validate({ params: organizationIdParamSchema }),
  organizationsController.getOrganization,
);

router.post(
  '/',
  requirePermission(PERMISSIONS.ORGANIZATIONS_CREATE),
  requireAccountType('super_admin'),
  validate({ body: createOrganizationSchema }),
  organizationsController.createOrganization,
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.ORGANIZATIONS_UPDATE),
  requireAccountType('super_admin'),
  validate({ params: organizationIdParamSchema, body: updateOrganizationSchema }),
  organizationsController.updateOrganization,
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.ORGANIZATIONS_DELETE),
  requireAccountType('super_admin'),
  validate({ params: organizationIdParamSchema }),
  organizationsController.deleteOrganization,
);

export default router;
