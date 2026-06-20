import type { Request } from 'express';
import type { FilterQuery } from 'mongoose';
import { User, type IUser } from '../../models/User';
import { Role } from '../../models/Role';
import { Agent } from '../../models/Agent';
import { Customer } from '../../models/Customer';
import { Organization } from '../../models/Organization';
import { AppError } from '../../utils/app-error';
import { hashPassword } from '../../utils/password';
import { withTransaction } from '../../utils/transaction';
import { createAgentProfile, createCustomerProfile } from '../../utils/profile-provisioning';
import { getAccessScope } from '../../utils/access-scope';
import { assertOrganizationAccess } from '../../utils/customer-scope';
import { recordAuditLog } from '../../middleware/audit';
import type { CreateUserDto, ListUsersQueryDto, UpdateUserDto } from './users.dto';

const createdByPopulate = {
  path: 'createdBy',
  select: 'name role',
  populate: { path: 'role', select: 'name' },
};

async function assertRoleExists(roleId: string): Promise<void> {
  const role = await Role.findById(roleId);
  if (!role) {
    throw AppError.badRequest('Selected role does not exist');
  }
}

async function resolveCanonicalRole(name: string): Promise<string> {
  const role = await Role.findOne({ name });
  if (!role) {
    throw AppError.badRequest(`${name} role is not configured — run the seed script`);
  }
  return role.id as string;
}

async function resolveRoleForAccountType(
  accountType: CreateUserDto['accountType'],
  requestedRoleId?: string,
): Promise<string> {
  if (accountType === 'agent') return resolveCanonicalRole('Collection Agent');
  if (accountType === 'customer') return resolveCanonicalRole('Customer');
  if (accountType === 'super_admin') return resolveCanonicalRole('Super Admin');
  // admin — the only tier with a free-form role picker, required by the DTO's superRefine.
  await assertRoleExists(requestedRoleId as string);
  return requestedRoleId as string;
}

async function assertOrganizationExists(organizationId: string): Promise<void> {
  const organization = await Organization.findById(organizationId);
  if (!organization) {
    throw AppError.badRequest('Selected organization does not exist');
  }
}

async function resolveOrganizationId(
  accountType: CreateUserDto['accountType'],
  requestedOrganizationId: string | undefined,
  req: Request,
): Promise<string | null> {
  if (!req.user) throw AppError.unauthorized();
  if (accountType === 'super_admin') return null;
  if (req.user.accountType === 'super_admin') {
    if (!requestedOrganizationId) {
      throw AppError.badRequest('organizationId is required when creating as a Super Admin');
    }
    await assertOrganizationExists(requestedOrganizationId);
    return requestedOrganizationId;
  }
  return req.user.organizationId;
}

export async function listUsers(query: ListUsersQueryDto, req: Request) {
  const scope = getAccessScope(req);
  const filter: FilterQuery<IUser> = {};
  if (query.accountType) filter.accountType = query.accountType;
  if (query.role) filter.role = query.role;
  if (query.isActive !== undefined) filter.isActive = query.isActive;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
      { mobile: { $regex: query.search, $options: 'i' } },
    ];
  }
  if (scope.accountType === 'super_admin') {
    if (query.organizationId) filter.organizationId = query.organizationId;
  } else {
    filter.organizationId = scope.organizationId;
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    User.find(filter)
      .populate('role', 'name permissions')
      .populate('organizationId', 'name code')
      .populate(createdByPopulate)
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

export async function getUserById(id: string, req?: Request) {
  const user = await User.findOne({ _id: id })
    .populate('role', 'name permissions')
    .populate('organizationId', 'name code')
    .populate(createdByPopulate);
  if (!user) {
    throw AppError.notFound('User not found');
  }
  if (req) {
    assertOrganizationAccess(user.organizationId, req);
  }
  return user;
}

export async function createUser(dto: CreateUserDto, req: Request) {
  if (!req.user) throw AppError.unauthorized();

  if (dto.accountType === 'super_admin' && req.user.accountType !== 'super_admin') {
    throw AppError.forbidden('Only a Super Admin can create another Super Admin account');
  }

  const organizationId = await resolveOrganizationId(dto.accountType, dto.organizationId, req);
  const roleId = await resolveRoleForAccountType(dto.accountType, dto.role);
  const creatorId = req.user.sub;

  const userId = await withTransaction(async (session) => {
    const passwordHash = await hashPassword(dto.password);
    const [user] = await User.create(
      [
        {
          name: dto.name,
          email: dto.email,
          mobile: dto.mobile,
          passwordHash,
          role: roleId,
          accountType: dto.accountType,
          organizationId,
          createdBy: creatorId,
        },
      ],
      { session },
    );
    if (!user) throw new Error('Failed to create user account');

    if (dto.accountType === 'agent') {
      await createAgentProfile(session, {
        name: dto.name,
        mobile: dto.mobile,
        email: dto.email,
        linkedUser: user._id,
        createdBy: creatorId,
        organizationId,
      });
    } else if (dto.accountType === 'customer') {
      await createCustomerProfile(session, {
        name: dto.name,
        mobile: dto.mobile,
        email: dto.email,
        linkedUser: user._id,
        createdBy: creatorId,
        organizationId,
      });
    }

    return user.id as string;
  });

  await recordAuditLog({
    req,
    action: 'user.created',
    entityType: 'User',
    entityId: userId,
    metadata: { email: dto.email, accountType: dto.accountType },
  });
  if (dto.accountType === 'agent' || dto.accountType === 'customer') {
    await recordAuditLog({
      req,
      action: dto.accountType === 'agent' ? 'agent.created' : 'customer.created',
      entityType: dto.accountType === 'agent' ? 'Agent' : 'Customer',
      metadata: { linkedUser: userId },
    });
  }

  return getUserById(userId, req);
}

export async function updateUser(id: string, dto: UpdateUserDto, req: Request) {
  const user = await User.findById(id);
  if (!user) {
    throw AppError.notFound('User not found');
  }
  assertOrganizationAccess(user.organizationId, req);

  if (dto.role) {
    if (user.accountType === 'agent' || user.accountType === 'customer') {
      throw AppError.badRequest('Role for this account type is managed automatically');
    }
    await assertRoleExists(dto.role);
    user.role = dto.role as unknown as IUser['role'];
  }
  if (dto.name !== undefined) user.name = dto.name;
  if (dto.email !== undefined) user.email = dto.email;
  if (dto.mobile !== undefined) user.mobile = dto.mobile;
  if (dto.isActive !== undefined) user.isActive = dto.isActive;

  const profileFields: Record<string, unknown> = {};
  if (dto.name !== undefined) profileFields.name = dto.name;
  if (dto.email !== undefined) profileFields.email = dto.email;
  if (dto.mobile !== undefined) profileFields.mobile = dto.mobile;

  await withTransaction(async (session) => {
    await user.save({ session });

    if (user.accountType === 'agent' && (Object.keys(profileFields).length || dto.isActive !== undefined)) {
      const update = { ...profileFields } as Record<string, unknown>;
      if (dto.isActive !== undefined) update.status = dto.isActive ? 'active' : 'inactive';
      await Agent.findOneAndUpdate({ linkedUser: user._id }, update, { session });
    } else if (
      user.accountType === 'customer' &&
      (Object.keys(profileFields).length || dto.isActive !== undefined)
    ) {
      const update = { ...profileFields } as Record<string, unknown>;
      if (dto.isActive !== undefined) update.isActive = dto.isActive;
      await Customer.findOneAndUpdate({ linkedUser: user._id }, update, { session });
    }
  });

  await recordAuditLog({
    req,
    action: 'user.updated',
    entityType: 'User',
    entityId: id,
    metadata: { fields: Object.keys(dto) },
  });

  return getUserById(id, req);
}

export async function deleteUser(id: string, req: Request): Promise<void> {
  if (req.user?.sub === id) {
    throw AppError.badRequest('You cannot delete your own account');
  }

  const user = await User.findById(id);
  if (!user) {
    throw AppError.notFound('User not found');
  }
  assertOrganizationAccess(user.organizationId, req);

  await withTransaction(async (session) => {
    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save({ session });

    if (user.accountType === 'agent') {
      await Agent.findOneAndUpdate(
        { linkedUser: user._id },
        { status: 'inactive' },
        { session },
      );
    } else if (user.accountType === 'customer') {
      await Customer.findOneAndUpdate(
        { linkedUser: user._id },
        { isActive: false },
        { session },
      );
    }
  });

  await recordAuditLog({
    req,
    action: 'user.deleted',
    entityType: 'User',
    entityId: id,
  });
}
