import type { Request } from 'express';
import type { FilterQuery } from 'mongoose';
import { User, type IUser } from '../../models/User';
import { Role } from '../../models/Role';
import { AppError } from '../../utils/app-error';
import { hashPassword } from '../../utils/password';
import { recordAuditLog } from '../../middleware/audit';
import type { CreateUserDto, ListUsersQueryDto, UpdateUserDto } from './users.dto';

async function assertRoleExists(roleId: string): Promise<void> {
  const role = await Role.findById(roleId);
  if (!role) {
    throw AppError.badRequest('Selected role does not exist');
  }
}

export async function listUsers(query: ListUsersQueryDto) {
  const filter: FilterQuery<IUser> = {};
  if (query.accountType) filter.accountType = query.accountType;
  if (query.isActive !== undefined) filter.isActive = query.isActive;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
      { mobile: { $regex: query.search, $options: 'i' } },
    ];
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    User.find(filter)
      .populate('role', 'name permissions')
      .skip(skip)
      .limit(query.limit)
      .sort({ createdAt: -1 }),
    User.countDocuments(filter),
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

export async function getUserById(id: string) {
  const user = await User.findById(id).populate('role', 'name permissions');
  if (!user) {
    throw AppError.notFound('User not found');
  }
  return user;
}

export async function createUser(dto: CreateUserDto, req: Request) {
  await assertRoleExists(dto.role);

  const passwordHash = await hashPassword(dto.password);
  const user = await User.create({
    name: dto.name,
    email: dto.email,
    mobile: dto.mobile,
    passwordHash,
    role: dto.role,
    accountType: dto.accountType,
  });

  await recordAuditLog({
    req,
    action: 'user.created',
    entityType: 'User',
    entityId: user.id as string,
    metadata: { email: user.email, accountType: user.accountType },
  });

  return getUserById(user.id as string);
}

export async function updateUser(id: string, dto: UpdateUserDto, req: Request) {
  const user = await User.findById(id);
  if (!user) {
    throw AppError.notFound('User not found');
  }

  if (dto.role) {
    await assertRoleExists(dto.role);
    user.role = dto.role as unknown as IUser['role'];
  }
  if (dto.name !== undefined) user.name = dto.name;
  if (dto.email !== undefined) user.email = dto.email;
  if (dto.mobile !== undefined) user.mobile = dto.mobile;
  if (dto.accountType !== undefined) user.accountType = dto.accountType;
  if (dto.isActive !== undefined) user.isActive = dto.isActive;

  await user.save();

  await recordAuditLog({
    req,
    action: 'user.updated',
    entityType: 'User',
    entityId: id,
    metadata: { fields: Object.keys(dto) },
  });

  return getUserById(id);
}

export async function deleteUser(id: string, req: Request): Promise<void> {
  if (req.user?.sub === id) {
    throw AppError.badRequest('You cannot delete your own account');
  }

  const user = await User.findById(id);
  if (!user) {
    throw AppError.notFound('User not found');
  }

  await user.softDelete();

  await recordAuditLog({
    req,
    action: 'user.deleted',
    entityType: 'User',
    entityId: id,
  });
}
