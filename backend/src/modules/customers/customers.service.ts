import type { Request } from 'express';
import { Types, type FilterQuery } from 'mongoose';
import { Customer, type ICustomer } from '../../models/Customer';
import { Agent } from '../../models/Agent';
import { User } from '../../models/User';
import { Role } from '../../models/Role';
import { Organization } from '../../models/Organization';
import { AppError } from '../../utils/app-error';
import { hashPassword } from '../../utils/password';
import { withTransaction } from '../../utils/transaction';
import { createCustomerProfile } from '../../utils/profile-provisioning';
import { recordAuditLog } from '../../middleware/audit';
import { getAccessScope, type AccessScope } from '../../utils/access-scope';
import { assertOrganizationAccess } from '../../utils/customer-scope';
import { storageProvider, type UploadedFile } from '../../providers/storage.provider';
import type {
  AddCustomerNoteDto,
  CreateCustomerDto,
  DOCUMENT_SLOTS,
  ListCustomersQueryDto,
  UpdateCustomerDto,
} from './customers.dto';

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

function applyCustomerScope(
  filter: FilterQuery<ICustomer>,
  scope: AccessScope,
  options: { includeOrg?: boolean } = {},
): FilterQuery<ICustomer> {
  let scoped = filter;
  if (scope.accountType === 'agent') {
    scoped = { ...scoped, assignedAgent: scope.profileId };
  } else if (scope.accountType === 'customer') {
    scoped = { ...scoped, _id: scope.profileId };
  }
  if (options.includeOrg !== false && scope.accountType !== 'super_admin') {
    scoped = { ...scoped, organizationId: scope.organizationId };
  }
  return scoped;
}

export async function listCustomers(query: ListCustomersQueryDto, req: Request) {
  const scope = getAccessScope(req);
  let filter: FilterQuery<ICustomer> = {};
  if (query.assignedAgent) filter.assignedAgent = query.assignedAgent;
  if (query.isActive !== undefined) filter.isActive = query.isActive;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { mobile: { $regex: query.search, $options: 'i' } },
      { customerCode: { $regex: query.search, $options: 'i' } },
    ];
  }
  if (scope.accountType === 'super_admin' && query.organizationId) {
    filter.organizationId = query.organizationId;
  }
  filter = applyCustomerScope(filter, scope);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Customer.find(filter)
      .populate('assignedAgent', 'name agentCode')
      .populate('organizationId', 'name code')
      .populate(createdByPopulate)
      .skip(skip)
      .limit(query.limit)
      .sort({ createdAt: -1 }),
    Customer.countDocuments(filter),
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

export async function getCustomerById(id: string, req: Request) {
  const scope = getAccessScope(req);
  const filter = applyCustomerScope({ _id: id }, scope, { includeOrg: false });
  const customer = await Customer.findOne(filter)
    .populate('assignedAgent', 'name agentCode')
    .populate('organizationId', 'name code')
    .populate(createdByPopulate);
  if (!customer) {
    throw AppError.notFound('Customer not found');
  }
  assertOrganizationAccess(customer.organizationId, req);
  return customer;
}

async function assertAgentBelongsToOrganization(
  agentId: string,
  organizationId: Types.ObjectId | string | null,
): Promise<void> {
  const agent = await Agent.findById(agentId);
  if (!agent) {
    throw AppError.badRequest('Assigned agent does not exist');
  }
  if (String(agent.organizationId) !== String(organizationId)) {
    throw AppError.badRequest('Assigned agent does not belong to the selected organization');
  }
}

export async function createCustomer(dto: CreateCustomerDto, req: Request) {
  if (!req.user) throw AppError.unauthorized();
  const creatorId = req.user.sub;

  const organizationId = await resolveOrganizationId(dto, req);
  if (dto.assignedAgent) {
    await assertAgentBelongsToOrganization(dto.assignedAgent, organizationId);
  }

  const customerRole = await Role.findOne({ name: 'Customer' });
  if (!customerRole) {
    throw AppError.badRequest('Customer role is not configured — run the seed script');
  }

  const customerId = await withTransaction(async (session) => {
    const passwordHash = await hashPassword(dto.password);
    const [user] = await User.create(
      [
        {
          name: dto.name,
          email: dto.email,
          mobile: dto.mobile,
          passwordHash,
          role: customerRole.id as string,
          accountType: 'customer',
          organizationId,
        },
      ],
      { session },
    );
    if (!user) throw new Error('Failed to create linked user account');

    const customer = await createCustomerProfile(session, {
      name: dto.name,
      mobile: dto.mobile,
      email: dto.email,
      dob: dto.dob,
      gender: dto.gender,
      aadhaarNumber: dto.aadhaarNumber,
      panNumber: dto.panNumber,
      address: dto.address,
      occupation: dto.occupation,
      monthlyIncome: dto.monthlyIncome,
      nominee: dto.nominee,
      assignedAgent: dto.assignedAgent,
      linkedUser: user._id,
      createdBy: creatorId,
      organizationId,
    });

    return customer.id as string;
  });

  await recordAuditLog({
    req,
    action: 'user.created',
    entityType: 'User',
    metadata: { email: dto.email, accountType: 'customer' },
  });
  await recordAuditLog({
    req,
    action: 'customer.created',
    entityType: 'Customer',
    entityId: customerId,
  });

  return getCustomerById(customerId, req);
}

export async function updateCustomer(id: string, dto: UpdateCustomerDto, req: Request) {
  const customer = await Customer.findOne(
    applyCustomerScope({ _id: id }, getAccessScope(req), { includeOrg: false }),
  );
  if (!customer) {
    throw AppError.notFound('Customer not found');
  }
  assertOrganizationAccess(customer.organizationId, req);

  if (dto.assignedAgent) {
    await assertAgentBelongsToOrganization(dto.assignedAgent, customer.organizationId);
  }

  Object.assign(customer, dto);

  await withTransaction(async (session) => {
    await customer.save({ session });

    if (customer.linkedUser && (dto.name || dto.email || dto.mobile || dto.isActive !== undefined)) {
      const update: Record<string, unknown> = {};
      if (dto.name !== undefined) update.name = dto.name;
      if (dto.email !== undefined) update.email = dto.email;
      if (dto.mobile !== undefined) update.mobile = dto.mobile;
      if (dto.isActive !== undefined) update.isActive = dto.isActive;
      await User.findByIdAndUpdate(customer.linkedUser, update, { session });
    }
  });

  await recordAuditLog({
    req,
    action: 'customer.updated',
    entityType: 'Customer',
    entityId: id,
    metadata: { fields: Object.keys(dto) },
  });

  return getCustomerById(id, req);
}

export async function deleteCustomer(id: string, req: Request): Promise<void> {
  const customer = await Customer.findOne(
    applyCustomerScope({ _id: id }, getAccessScope(req), { includeOrg: false }),
  );
  if (!customer) {
    throw AppError.notFound('Customer not found');
  }
  assertOrganizationAccess(customer.organizationId, req);

  await withTransaction(async (session) => {
    customer.isDeleted = true;
    customer.deletedAt = new Date();
    await customer.save({ session });

    if (customer.linkedUser) {
      await User.findByIdAndUpdate(customer.linkedUser, { isActive: false }, { session });
    }
  });

  await recordAuditLog({
    req,
    action: 'customer.deleted',
    entityType: 'Customer',
    entityId: id,
  });
}

export async function addCustomerNote(id: string, dto: AddCustomerNoteDto, req: Request) {
  if (!req.user) throw AppError.unauthorized();

  const customer = await Customer.findById(id);
  if (!customer) {
    throw AppError.notFound('Customer not found');
  }
  assertOrganizationAccess(customer.organizationId, req);

  customer.notes.push({
    author: Types.ObjectId.createFromHexString(req.user.sub),
    text: dto.text,
    createdAt: new Date(),
  });
  await customer.save();

  await recordAuditLog({
    req,
    action: 'customer.note_added',
    entityType: 'Customer',
    entityId: id,
  });

  return customer;
}

export async function uploadCustomerDocument(
  id: string,
  slot: (typeof DOCUMENT_SLOTS)[number],
  file: UploadedFile,
  req: Request,
) {
  const customer = await Customer.findById(id);
  if (!customer) {
    throw AppError.notFound('Customer not found');
  }
  assertOrganizationAccess(customer.organizationId, req);

  const result = await storageProvider.upload(file, `customers/${id}`);
  const documentFile = {
    name: file.originalName,
    url: result.url,
    publicId: result.publicId,
    uploadedAt: new Date(),
  };

  if (slot === 'other') {
    customer.documents.other.push(documentFile);
  } else {
    customer.documents[slot] = documentFile;
  }
  await customer.save();

  await recordAuditLog({
    req,
    action: 'customer.document_uploaded',
    entityType: 'Customer',
    entityId: id,
    metadata: { slot },
  });

  return customer;
}
