import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { PERMISSIONS } from '../../constants/permissions';
import * as collectionsController from './collections.controller';
import {
  collectionIdParamSchema,
  createCollectionSchema,
  listCollectionsQuerySchema,
  listPendingQuerySchema,
} from './collections.dto';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.COLLECTIONS_READ),
  validate({ query: listCollectionsQuerySchema }),
  collectionsController.listCollections,
);

router.post(
  '/',
  requirePermission(PERMISSIONS.COLLECTIONS_CREATE),
  validate({ body: createCollectionSchema }),
  collectionsController.createCollection,
);

router.get(
  '/pending',
  requirePermission(PERMISSIONS.COLLECTIONS_READ),
  validate({ query: listPendingQuerySchema }),
  collectionsController.listPendingCollections,
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.COLLECTIONS_READ),
  validate({ params: collectionIdParamSchema }),
  collectionsController.getCollection,
);

export default router;
