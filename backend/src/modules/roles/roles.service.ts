import type { Request } from 'express';
import type { FilterQuery } from 'mongoose';
import { Role, type IRole } from '../../models/Role';
import { User } from '../../models/User';
import { AppError } from '../../utils/app-error';
import { recordAuditLog } from '../../middleware/audit';
import type { CreateRoleDto, ListRolesQueryDto, UpdateRoleDto } from './roles.dto';

export async function listRoles(query: ListRolesQueryDto) {
  const filter: FilterQuery<IRole> = {};
  if (query.search) {
    filter.name = { $regex: query.search, $options: 'i' };
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Role.find(filter).skip(skip).limit(query.limit).sort({ createdAt: -1 }),
    Role.countDocuments(filter),
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

export async function getRoleById(id: string) {
  const role = await Role.findById(id);
  if (!role) {
    throw AppError.notFound('Role not found');
  }
  return role;
}

export async function createRole(dto: CreateRoleDto, req: Request) {
  const role = await Role.create({
    name: dto.name,
    description: dto.description,
    permissions: dto.permissions,
  });

  await recordAuditLog({
    req,
    action: 'role.created',
    entityType: 'Role',
    entityId: role.id as string,
    metadata: { name: role.name },
  });

  return role;
}

export async function updateRole(id: string, dto: UpdateRoleDto, req: Request) {
  const role = await Role.findById(id);
  if (!role) {
    throw AppError.notFound('Role not found');
  }
  if (role.isSystem) {
    throw AppError.forbidden('System roles cannot be modified');
  }

  if (dto.name !== undefined) role.name = dto.name;
  if (dto.description !== undefined) role.description = dto.description;
  if (dto.permissions !== undefined) role.permissions = dto.permissions;
  await role.save();

  await recordAuditLog({
    req,
    action: 'role.updated',
    entityType: 'Role',
    entityId: id,
    metadata: { fields: Object.keys(dto) },
  });

  return role;
}

export async function deleteRole(id: string, req: Request): Promise<void> {
  const role = await Role.findById(id);
  if (!role) {
    throw AppError.notFound('Role not found');
  }
  if (role.isSystem) {
    throw AppError.forbidden('System roles cannot be deleted');
  }

  const assignedUserCount = await User.countDocuments({ role: id });
  if (assignedUserCount > 0) {
    throw AppError.conflict('Role is assigned to one or more users and cannot be deleted');
  }

  await role.softDelete();

  await recordAuditLog({
    req,
    action: 'role.deleted',
    entityType: 'Role',
    entityId: id,
  });
}
