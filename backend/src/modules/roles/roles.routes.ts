import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { PERMISSIONS } from '../../constants/permissions';
import * as rolesController from './roles.controller';
import {
  createRoleSchema,
  listRolesQuerySchema,
  roleIdParamSchema,
  updateRoleSchema,
} from './roles.dto';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.ROLES_READ),
  validate({ query: listRolesQuerySchema }),
  rolesController.listRoles,
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.ROLES_READ),
  validate({ params: roleIdParamSchema }),
  rolesController.getRole,
);

router.post(
  '/',
  requirePermission(PERMISSIONS.ROLES_CREATE),
  validate({ body: createRoleSchema }),
  rolesController.createRole,
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.ROLES_UPDATE),
  validate({ params: roleIdParamSchema, body: updateRoleSchema }),
  rolesController.updateRole,
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.ROLES_DELETE),
  validate({ params: roleIdParamSchema }),
  rolesController.deleteRole,
);

export default router;
