import type { Request } from 'express';
import { Types, type FilterQuery } from 'mongoose';
import { Customer, type ICustomer } from '../../models/Customer';
import { Agent } from '../../models/Agent';
import { AppError } from '../../utils/app-error';
import { generateCode } from '../../utils/sequence';
import { recordAuditLog } from '../../middleware/audit';
import { getAccessScope, type AccessScope } from '../../utils/access-scope';
import { storageProvider, type UploadedFile } from '../../providers/storage.provider';
import type {
  AddCustomerNoteDto,
  CreateCustomerDto,
  DOCUMENT_SLOTS,
  ListCustomersQueryDto,
  UpdateCustomerDto,
} from './customers.dto';

function applyCustomerScope(
  filter: FilterQuery<ICustomer>,
  scope: AccessScope,
): FilterQuery<ICustomer> {
  if (scope.accountType === 'agent') {
    return { ...filter, assignedAgent: scope.profileId };
  }
  if (scope.accountType === 'customer') {
    return { ...filter, _id: scope.profileId };
  }
  return filter;
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
  filter = applyCustomerScope(filter, scope);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Customer.find(filter)
      .populate('assignedAgent', 'name agentCode')
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
  const filter = applyCustomerScope({ _id: id }, scope);
  const customer = await Customer.findOne(filter).populate('assignedAgent', 'name agentCode');
  if (!customer) {
    throw AppError.notFound('Customer not found');
  }
  return customer;
}

async function assertAgentExists(agentId: string): Promise<void> {
  const agent = await Agent.findById(agentId);
  if (!agent) {
    throw AppError.badRequest('Assigned agent does not exist');
  }
}

export async function createCustomer(dto: CreateCustomerDto, req: Request) {
  if (dto.assignedAgent) {
    await assertAgentExists(dto.assignedAgent);
  }

  const customerCode = await generateCode('CUST', 'customer_seq');
  const customer = await Customer.create({ ...dto, customerCode });

  await recordAuditLog({
    req,
    action: 'customer.created',
    entityType: 'Customer',
    entityId: customer.id as string,
    metadata: { customerCode },
  });

  return getCustomerById(customer.id as string, req);
}

export async function updateCustomer(id: string, dto: UpdateCustomerDto, req: Request) {
  if (dto.assignedAgent) {
    await assertAgentExists(dto.assignedAgent);
  }

  const customer = await Customer.findById(id);
  if (!customer) {
    throw AppError.notFound('Customer not found');
  }

  Object.assign(customer, dto);
  await customer.save();

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
  const customer = await Customer.findById(id);
  if (!customer) {
    throw AppError.notFound('Customer not found');
  }

  await customer.softDelete();

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
