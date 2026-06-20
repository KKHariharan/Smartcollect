import type { Request } from 'express';
import type { FilterQuery } from 'mongoose';
import { Organization, type IOrganization } from '../../models/Organization';
import { User } from '../../models/User';
import { AppError } from '../../utils/app-error';
import { generateCode } from '../../utils/sequence';
import { getAccessScope } from '../../utils/access-scope';
import { assertOrganizationAccess } from '../../utils/customer-scope';
import { recordAuditLog } from '../../middleware/audit';
import type {
  CreateOrganizationDto,
  ListOrganizationsQueryDto,
  UpdateOrganizationDto,
} from './organizations.dto';

function applyOrganizationScope(req: Request, filter: FilterQuery<IOrganization>) {
  const scope = getAccessScope(req);
  if (scope.accountType === 'super_admin') {
    return filter;
  }
  if (filter._id !== undefined && String(filter._id) !== String(scope.organizationId)) {
    // Requested a specific org that isn't the caller's own — force a no-match rather than
    // silently substituting the caller's organizationId for the requested one.
    return { ...filter, _id: null };
  }
  return { ...filter, _id: scope.organizationId };
}

export async function listOrganizations(query: ListOrganizationsQueryDto, req: Request) {
  let filter: FilterQuery<IOrganization> = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    filter.name = { $regex: query.search, $options: 'i' };
  }
  filter = applyOrganizationScope(req, filter);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Organization.find(filter).skip(skip).limit(query.limit).sort({ createdAt: -1 }),
    Organization.countDocuments(filter),
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

export async function getOrganizationById(id: string, req: Request) {
  const organization = await Organization.findById(id);
  if (!organization) {
    throw AppError.notFound('Organization not found');
  }
  assertOrganizationAccess(organization._id, req);
  return organization;
}

export async function createOrganization(dto: CreateOrganizationDto, req: Request) {
  if (!req.user) throw AppError.unauthorized();

  const code = await generateCode('ORG', 'organization_seq');
  const organization = await Organization.create({
    name: dto.name,
    status: dto.status,
    code,
    createdBy: req.user.sub,
  });

  await recordAuditLog({
    req,
    action: 'organization.created',
    entityType: 'Organization',
    entityId: organization.id as string,
    metadata: { code },
  });

  return organization;
}

export async function updateOrganization(id: string, dto: UpdateOrganizationDto, req: Request) {
  const organization = await Organization.findById(id);
  if (!organization) {
    throw AppError.notFound('Organization not found');
  }
  assertOrganizationAccess(organization._id, req);

  if (dto.name !== undefined) organization.name = dto.name;
  if (dto.status !== undefined) organization.status = dto.status;
  await organization.save();

  await recordAuditLog({
    req,
    action: 'organization.updated',
    entityType: 'Organization',
    entityId: id,
    metadata: { fields: Object.keys(dto) },
  });

  return organization;
}

export async function deleteOrganization(id: string, req: Request): Promise<void> {
  const organization = await Organization.findById(id);
  if (!organization) {
    throw AppError.notFound('Organization not found');
  }
  assertOrganizationAccess(organization._id, req);

  const assignedUserCount = await User.countDocuments({ organizationId: id });
  if (assignedUserCount > 0) {
    throw AppError.conflict('Organization has users assigned to it and cannot be deleted');
  }

  await organization.softDelete();

  await recordAuditLog({
    req,
    action: 'organization.deleted',
    entityType: 'Organization',
    entityId: id,
  });
}
