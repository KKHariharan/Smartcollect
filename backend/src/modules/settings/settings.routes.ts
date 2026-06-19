import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { PERMISSIONS } from '../../constants/permissions';
import * as settingsController from './settings.controller';
import { updateSettingsSchema } from './settings.dto';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission(PERMISSIONS.SETTINGS_READ), settingsController.getSettings);

router.patch(
  '/',
  requirePermission(PERMISSIONS.SETTINGS_UPDATE),
  validate({ body: updateSettingsSchema }),
  settingsController.updateSettings,
);

export default router;
