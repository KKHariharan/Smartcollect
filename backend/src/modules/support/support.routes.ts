import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { PERMISSIONS } from '../../constants/permissions';
import * as supportController from './support.controller';
import {
  addTicketMessageSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  ticketIdParamSchema,
  updateTicketStatusSchema,
} from './support.dto';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.SUPPORT_READ),
  validate({ query: listTicketsQuerySchema }),
  supportController.listTickets,
);

router.post(
  '/',
  requirePermission(PERMISSIONS.SUPPORT_CREATE),
  validate({ body: createTicketSchema }),
  supportController.createTicket,
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.SUPPORT_READ),
  validate({ params: ticketIdParamSchema }),
  supportController.getTicket,
);

router.patch(
  '/:id/status',
  requirePermission(PERMISSIONS.SUPPORT_UPDATE),
  validate({ params: ticketIdParamSchema, body: updateTicketStatusSchema }),
  supportController.updateTicketStatus,
);

router.post(
  '/:id/messages',
  requirePermission(PERMISSIONS.SUPPORT_READ),
  validate({ params: ticketIdParamSchema, body: addTicketMessageSchema }),
  supportController.addTicketMessage,
);

export default router;
