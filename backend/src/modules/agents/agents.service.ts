import type { Request } from 'express';
import type { FilterQuery } from 'mongoose';
import { Agent, type IAgent } from '../../models/Agent';
import { Customer } from '../../models/Customer';
import { User } from '../../models/User';
import { Loan } from '../../models/Loan';
import { Collection } from '../../models/Collection';
import { AppError } from '../../utils/app-error';
import { generateCode } from '../../utils/sequence';
import { recordAuditLog } from '../../middleware/audit';
import type {
  AssignCustomersDto,
  CreateAgentDto,
  ListAgentsQueryDto,
  UpdateAgentDto,
} from './agents.dto';

async function assertLinkedUserExists(userId: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.badRequest('Linked user does not exist');
  }
}

export async function listAgents(query: ListAgentsQueryDto) {
  const filter: FilterQuery<IAgent> = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { mobile: { $regex: query.search, $options: 'i' } },
      { agentCode: { $regex: query.search, $options: 'i' } },
    ];
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Agent.find(filter).skip(skip).limit(query.limit).sort({ createdAt: -1 }),
    Agent.countDocuments(filter),
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

export async function getAgentById(id: string) {
  const agent = await Agent.findById(id);
  if (!agent) {
    throw AppError.notFound('Agent not found');
  }
  return agent;
}

export async function createAgent(dto: CreateAgentDto, req: Request) {
  if (dto.linkedUser) {
    await assertLinkedUserExists(dto.linkedUser);
  }

  const agentCode = await generateCode('AGT', 'agent_seq');
  const agent = await Agent.create({ ...dto, agentCode });

  await recordAuditLog({
    req,
    action: 'agent.created',
    entityType: 'Agent',
    entityId: agent.id as string,
    metadata: { agentCode },
  });

  return agent;
}

export async function updateAgent(id: string, dto: UpdateAgentDto, req: Request) {
  if (dto.linkedUser) {
    await assertLinkedUserExists(dto.linkedUser);
  }

  const agent = await Agent.findById(id);
  if (!agent) {
    throw AppError.notFound('Agent not found');
  }

  Object.assign(agent, dto);
  await agent.save();

  await recordAuditLog({
    req,
    action: 'agent.updated',
    entityType: 'Agent',
    entityId: id,
    metadata: { fields: Object.keys(dto) },
  });

  return agent;
}

export async function deleteAgent(id: string, req: Request): Promise<void> {
  const agent = await Agent.findById(id);
  if (!agent) {
    throw AppError.notFound('Agent not found');
  }

  const assignedCount = await Customer.countDocuments({ assignedAgent: id });
  if (assignedCount > 0) {
    throw AppError.conflict('Agent has assigned customers and cannot be deleted');
  }

  await agent.softDelete();

  await recordAuditLog({
    req,
    action: 'agent.deleted',
    entityType: 'Agent',
    entityId: id,
  });
}

export async function getAgentCustomers(id: string) {
  await getAgentById(id);
  return Customer.find({ assignedAgent: id }).sort({ createdAt: -1 });
}

export async function assignCustomers(id: string, dto: AssignCustomersDto, req: Request) {
  await getAgentById(id);

  const result = await Customer.updateMany(
    { _id: { $in: dto.customerIds } },
    { $set: { assignedAgent: id } },
  );

  await recordAuditLog({
    req,
    action: 'agent.customers_assigned',
    entityType: 'Agent',
    entityId: id,
    metadata: { customerIds: dto.customerIds, matched: result.matchedCount },
  });

  return { matched: result.matchedCount, modified: result.modifiedCount };
}

export async function unassignCustomers(id: string, dto: AssignCustomersDto, req: Request) {
  await getAgentById(id);

  const result = await Customer.updateMany(
    { _id: { $in: dto.customerIds }, assignedAgent: id },
    { $set: { assignedAgent: null } },
  );

  await recordAuditLog({
    req,
    action: 'agent.customers_unassigned',
    entityType: 'Agent',
    entityId: id,
    metadata: { customerIds: dto.customerIds, matched: result.matchedCount },
  });

  return { matched: result.matchedCount, modified: result.modifiedCount };
}

export async function getAgentPerformance(id: string, from?: Date, to?: Date) {
  await getAgentById(id);

  const customerIds = await Customer.find({ assignedAgent: id }).distinct('_id');
  const assignedCustomers = customerIds.length;
  const [activeLoans, closedLoans] = await Promise.all([
    Loan.countDocuments({ customer: { $in: customerIds }, status: 'active' }),
    Loan.countDocuments({ customer: { $in: customerIds }, status: 'closed' }),
  ]);

  const collectionDateFilter: Record<string, Date> = {};
  if (from) collectionDateFilter.$gte = from;
  if (to) collectionDateFilter.$lte = to;

  const collectionFilter: FilterQuery<{ customer: unknown; collectionDate?: unknown }> = {
    customer: { $in: customerIds },
  };
  if (from || to) {
    collectionFilter.collectionDate = collectionDateFilter;
  }

  const [collectionCount, collectionTotalAgg] = await Promise.all([
    Collection.countDocuments(collectionFilter),
    Collection.aggregate<{ _id: null; total: number }>([
      { $match: collectionFilter },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  return {
    assignedCustomers,
    activeLoans,
    closedLoans,
    collectionCount,
    totalCollected: collectionTotalAgg[0]?.total ?? 0,
  };
}
