import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { PERMISSIONS } from '../../constants/permissions';
import * as usersController from './users.controller';
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamSchema,
} from './users.dto';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.USERS_READ),
  validate({ query: listUsersQuerySchema }),
  usersController.listUsers,
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.USERS_READ),
  validate({ params: userIdParamSchema }),
  usersController.getUser,
);

router.post(
  '/',
  requirePermission(PERMISSIONS.USERS_CREATE),
  validate({ body: createUserSchema }),
  usersController.createUser,
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.USERS_UPDATE),
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  usersController.updateUser,
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.USERS_DELETE),
  validate({ params: userIdParamSchema }),
  usersController.deleteUser,
);

export default router;
