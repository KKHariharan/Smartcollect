import type { Request } from 'express';
import { Types, type FilterQuery } from 'mongoose';
import { Agent, type IAgent } from '../../models/Agent';
import { Customer } from '../../models/Customer';
import { User } from '../../models/User';
import { Role } from '../../models/Role';
import { Organization } from '../../models/Organization';
import { Loan } from '../../models/Loan';
import { Collection } from '../../models/Collection';
import { AppError } from '../../utils/app-error';
import { hashPassword } from '../../utils/password';
import { withTransaction } from '../../utils/transaction';
import { createAgentProfile } from '../../utils/profile-provisioning';
import { getAccessScope } from '../../utils/access-scope';
import { assertOrganizationAccess } from '../../utils/customer-scope';
import { recordAuditLog } from '../../middleware/audit';
import type {
  AssignCustomersDto,
  CreateAgentDto,
  ListAgentsQueryDto,
  UpdateAgentDto,
} from './agents.dto';

const createdByPopulate = {
  path: 'createdBy',
  select: 'name role',
  populate: { path: 'role', select: 'name' },
};

async function assertOrganizationExists(organizationId: string): Promise<void> {
  const organization = await Organization.findById(organizationId);
  if (!organization) {
    throw AppError.badRequest('Selected organization does not exist');
  }
}

async function resolveOrganizationId(dto: { organizationId?: string }, req: Request) {
  if (!req.user) throw AppError.unauthorized();
  if (req.user.accountType === 'super_admin') {
    if (!dto.organizationId) {
      throw AppError.badRequest('organizationId is required when creating as a Super Admin');
    }
    await assertOrganizationExists(dto.organizationId);
    return dto.organizationId;
  }
  return req.user.organizationId;
}

async function withAssignedCustomerCounts(agents: IAgent[]) {
  const agentIds = agents.map((agent) => agent._id);
  const counts = await Customer.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { assignedAgent: { $in: agentIds } } },
    { $group: { _id: '$assignedAgent', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

  return agents.map((agent) => {
    const json = agent.toJSON() as Record<string, unknown>;
    json.assignedCustomersCount = countMap.get(agent._id.toString()) ?? 0;
    return json;
  });
}

export async function listAgents(query: ListAgentsQueryDto, req: Request) {
  const scope = getAccessScope(req);
  const filter: FilterQuery<IAgent> = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { mobile: { $regex: query.search, $options: 'i' } },
      { agentCode: { $regex: query.search, $options: 'i' } },
    ];
  }
  if (scope.accountType === 'super_admin') {
    if (query.organizationId) filter.organizationId = query.organizationId;
  } else {
    filter.organizationId = scope.organizationId;
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Agent.find(filter)
      .populate(createdByPopulate)
      .populate('organizationId', 'name code')
      .skip(skip)
      .limit(query.limit)
      .sort({ createdAt: -1 }),
    Agent.countDocuments(filter),
  ]);

  return {
    items: await withAssignedCustomerCounts(items),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getAgentById(id: string, req: Request) {
  const agent = await Agent.findOne({ _id: id })
    .populate(createdByPopulate)
    .populate('organizationId', 'name code');
  if (!agent) {
    throw AppError.notFound('Agent not found');
  }
  assertOrganizationAccess(agent.organizationId, req);
  return agent;
}

export async function createAgent(dto: CreateAgentDto, req: Request) {
  if (!req.user) throw AppError.unauthorized();
  const creatorId = req.user.sub;

  const organizationId = await resolveOrganizationId(dto, req);

  const agentRole = await Role.findOne({ name: 'Collection Agent' });
  if (!agentRole) {
    throw AppError.badRequest('Collection Agent role is not configured — run the seed script');
  }

  const agentId = await withTransaction(async (session) => {
    const passwordHash = await hashPassword(dto.password);
    const [user] = await User.create(
      [
        {
          name: dto.name,
          email: dto.email,
          mobile: dto.mobile,
          passwordHash,
          role: agentRole.id as string,
          accountType: 'agent',
          organizationId,
        },
      ],
      { session },
    );
    if (!user) throw new Error('Failed to create linked user account');

    const agent = await createAgentProfile(session, {
      name: dto.name,
      mobile: dto.mobile,
      email: dto.email,
      area: dto.area,
      status: dto.status,
      linkedUser: user._id,
      createdBy: creatorId,
      organizationId,
    });

    return agent.id as string;
  });

  await recordAuditLog({
    req,
    action: 'user.created',
    entityType: 'User',
    metadata: { email: dto.email, accountType: 'agent' },
  });
  await recordAuditLog({
    req,
    action: 'agent.created',
    entityType: 'Agent',
    entityId: agentId,
  });

  return getAgentById(agentId, req);
}

export async function updateAgent(id: string, dto: UpdateAgentDto, req: Request) {
  const agent = await Agent.findOne({ _id: id });
  if (!agent) {
    throw AppError.notFound('Agent not found');
  }
  assertOrganizationAccess(agent.organizationId, req);

  Object.assign(agent, dto);

  await withTransaction(async (session) => {
    await agent.save({ session });

    if (agent.linkedUser && (dto.name || dto.email || dto.mobile || dto.status)) {
      const update: Record<string, unknown> = {};
      if (dto.name !== undefined) update.name = dto.name;
      if (dto.email !== undefined) update.email = dto.email;
      if (dto.mobile !== undefined) update.mobile = dto.mobile;
      if (dto.status !== undefined) update.isActive = dto.status === 'active';
      await User.findByIdAndUpdate(agent.linkedUser, update, { session });
    }
  });

  await recordAuditLog({
    req,
    action: 'agent.updated',
    entityType: 'Agent',
    entityId: id,
    metadata: { fields: Object.keys(dto) },
  });

  return getAgentById(id, req);
}

export async function deleteAgent(id: string, req: Request): Promise<void> {
  const agent = await Agent.findOne({ _id: id });
  if (!agent) {
    throw AppError.notFound('Agent not found');
  }
  assertOrganizationAccess(agent.organizationId, req);

  const assignedCount = await Customer.countDocuments({ assignedAgent: id });
  if (assignedCount > 0) {
    throw AppError.conflict('Agent has assigned customers and cannot be deleted');
  }

  await withTransaction(async (session) => {
    agent.isDeleted = true;
    agent.deletedAt = new Date();
    await agent.save({ session });

    if (agent.linkedUser) {
      await User.findByIdAndUpdate(agent.linkedUser, { isActive: false }, { session });
    }
  });

  await recordAuditLog({
    req,
    action: 'agent.deleted',
    entityType: 'Agent',
    entityId: id,
  });
}

export async function getAgentCustomers(id: string, req: Request) {
  await getAgentById(id, req);
  const organizationId = (await Agent.findById(id).select('organizationId'))?.organizationId;
  return Customer.find({ assignedAgent: id, organizationId }).sort({ createdAt: -1 });
}

export async function assignCustomers(id: string, dto: AssignCustomersDto, req: Request) {
  await getAgentById(id, req);
  const organizationId = (await Agent.findById(id).select('organizationId'))?.organizationId;

  const result = await Customer.updateMany(
    { _id: { $in: dto.customerIds }, organizationId },
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
  await getAgentById(id, req);
  const organizationId = (await Agent.findById(id).select('organizationId'))?.organizationId;

  const result = await Customer.updateMany(
    { _id: { $in: dto.customerIds }, assignedAgent: id, organizationId },
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

export async function getAgentPerformance(id: string, req: Request, from?: Date, to?: Date) {
  await getAgentById(id, req);
  const organizationId = (await Agent.findById(id).select('organizationId'))?.organizationId;

  const customerIds = await Customer.find({ assignedAgent: id, organizationId }).distinct('_id');
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
