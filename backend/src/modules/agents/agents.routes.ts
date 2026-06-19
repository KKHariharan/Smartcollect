import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { PERMISSIONS } from '../../constants/permissions';
import * as agentsController from './agents.controller';
import {
  agentIdParamSchema,
  agentPerformanceQuerySchema,
  assignCustomersSchema,
  createAgentSchema,
  listAgentsQuerySchema,
  updateAgentSchema,
} from './agents.dto';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.AGENTS_READ),
  validate({ query: listAgentsQuerySchema }),
  agentsController.listAgents,
);

router.post(
  '/',
  requirePermission(PERMISSIONS.AGENTS_CREATE),
  validate({ body: createAgentSchema }),
  agentsController.createAgent,
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.AGENTS_READ),
  validate({ params: agentIdParamSchema }),
  agentsController.getAgent,
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.AGENTS_UPDATE),
  validate({ params: agentIdParamSchema, body: updateAgentSchema }),
  agentsController.updateAgent,
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.AGENTS_DELETE),
  validate({ params: agentIdParamSchema }),
  agentsController.deleteAgent,
);

router.get(
  '/:id/customers',
  requirePermission(PERMISSIONS.AGENTS_READ),
  validate({ params: agentIdParamSchema }),
  agentsController.getAgentCustomers,
);

router.post(
  '/:id/assign-customers',
  requirePermission(PERMISSIONS.AGENTS_UPDATE),
  validate({ params: agentIdParamSchema, body: assignCustomersSchema }),
  agentsController.assignCustomers,
);

router.post(
  '/:id/unassign-customers',
  requirePermission(PERMISSIONS.AGENTS_UPDATE),
  validate({ params: agentIdParamSchema, body: assignCustomersSchema }),
  agentsController.unassignCustomers,
);

router.get(
  '/:id/performance',
  requirePermission(PERMISSIONS.AGENTS_READ),
  validate({ params: agentIdParamSchema, query: agentPerformanceQuerySchema }),
  agentsController.getAgentPerformance,
);

export default router;
