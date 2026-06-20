import type { Request } from 'express';
import { Types, type FilterQuery } from 'mongoose';
import { SupportTicket, type ISupportTicket } from '../../models/SupportTicket';
import { Customer } from '../../models/Customer';
import { AppError } from '../../utils/app-error';
import { generateCode } from '../../utils/sequence';
import { recordAuditLog } from '../../middleware/audit';
import { getAccessScope } from '../../utils/access-scope';
import { assertOrganizationAccess, resolveScopedCustomerFilter } from '../../utils/customer-scope';
import type {
  AddTicketMessageDto,
  CreateTicketDto,
  ListTicketsQueryDto,
  UpdateTicketStatusDto,
} from './support.dto';

export async function listTickets(query: ListTicketsQueryDto, req: Request) {
  const scope = getAccessScope(req);
  const scopedFilter = await resolveScopedCustomerFilter(req);
  const filter: FilterQuery<ISupportTicket> = { ...scopedFilter };
  if (scope.accountType !== 'super_admin') filter.organizationId = scope.organizationId;
  if (query.status) filter.status = query.status;
  if (query.customer) filter.customer = query.customer;

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    SupportTicket.find(filter)
      .populate('customer', 'name customerCode')
      .populate('raisedBy', 'name')
      .skip(skip)
      .limit(query.limit)
      .sort({ createdAt: -1 }),
    SupportTicket.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getTicketById(id: string, req: Request) {
  const scopedFilter = await resolveScopedCustomerFilter(req);
  const ticket = await SupportTicket.findOne({ _id: id, ...scopedFilter })
    .populate('customer', 'name customerCode')
    .populate('raisedBy', 'name');
  if (!ticket) {
    throw AppError.notFound('Support ticket not found');
  }
  assertOrganizationAccess(ticket.organizationId, req);
  return ticket;
}

export async function createTicket(dto: CreateTicketDto, req: Request) {
  if (!req.user) throw AppError.unauthorized();
  const scope = getAccessScope(req);

  let customerId = dto.customer;
  let organizationId: Types.ObjectId | string | null = scope.organizationId;
  if (scope.accountType === 'customer') {
    if (!scope.profileId) {
      throw AppError.forbidden('No customer profile is linked to this account');
    }
    customerId = scope.profileId;
  } else {
    const customer = await Customer.findById(dto.customer);
    if (!customer) {
      throw AppError.badRequest('Customer does not exist');
    }
    assertOrganizationAccess(customer.organizationId, req);
    organizationId = customer.organizationId;
  }

  const ticketNumber = await generateCode('TKT', 'ticket_seq');
  const ticket = await SupportTicket.create({
    ticketNumber,
    customer: customerId,
    organizationId,
    raisedBy: req.user.sub,
    subject: dto.subject,
    description: dto.description,
  });

  await recordAuditLog({
    req,
    action: 'support_ticket.created',
    entityType: 'SupportTicket',
    entityId: ticket.id as string,
    metadata: { ticketNumber },
  });

  return getTicketById(ticket.id as string, req);
}

export async function updateTicketStatus(id: string, dto: UpdateTicketStatusDto, req: Request) {
  const ticket = await SupportTicket.findById(id);
  if (!ticket) {
    throw AppError.notFound('Support ticket not found');
  }
  assertOrganizationAccess(ticket.organizationId, req);

  ticket.status = dto.status;
  ticket.resolvedAt = dto.status === 'resolved' || dto.status === 'closed' ? new Date() : null;
  await ticket.save();

  await recordAuditLog({
    req,
    action: 'support_ticket.status_updated',
    entityType: 'SupportTicket',
    entityId: id,
    metadata: { status: dto.status },
  });

  return getTicketById(id, req);
}

export async function addTicketMessage(id: string, dto: AddTicketMessageDto, req: Request) {
  if (!req.user) throw AppError.unauthorized();

  const scopedFilter = await resolveScopedCustomerFilter(req);
  const ticket = await SupportTicket.findOne({ _id: id, ...scopedFilter });
  if (!ticket) {
    throw AppError.notFound('Support ticket not found');
  }
  assertOrganizationAccess(ticket.organizationId, req);

  ticket.messages.push({
    author: Types.ObjectId.createFromHexString(req.user.sub),
    message: dto.message,
    createdAt: new Date(),
  });
  await ticket.save();

  await recordAuditLog({
    req,
    action: 'support_ticket.message_added',
    entityType: 'SupportTicket',
    entityId: id,
  });

  return getTicketById(id, req);
}
