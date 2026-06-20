import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { User, type IUser } from '../../models/User';
import type { IRole } from '../../models/Role';
import type { IOrganization } from '../../models/Organization';
import { Agent } from '../../models/Agent';
import { Customer } from '../../models/Customer';
import { AppError } from '../../utils/app-error';
import { comparePassword, hashPassword } from '../../utils/password';
import { generateRandomToken, hashToken } from '../../utils/crypto';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type AccessTokenPayload,
} from '../../utils/jwt';
import { env } from '../../config/env';
import { parseDurationToMs } from '../../utils/duration';
import { recordAuditLog } from '../../middleware/audit';
import { emailProvider } from '../../providers/email.provider';
import type { ChangePasswordDto, UpdateProfileDto } from './auth.dto';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

type PopulatedUser = Omit<IUser, 'role' | 'organizationId'> & {
  role: IRole;
  organizationId: IOrganization | null;
};

function toSafeUser(user: PopulatedUser) {
  return {
    id: user.id as string,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    accountType: user.accountType,
    organizationId: user.organizationId?.id ? (user.organizationId.id as string) : null,
    organization: user.organizationId
      ? { name: user.organizationId.name, code: user.organizationId.code }
      : null,
    isActive: user.isActive,
    role: {
      id: user.role.id as string,
      name: user.role.name,
      permissions: user.role.permissions,
    },
    lastLoginAt: user.lastLoginAt,
  };
}

async function resolveProfileId(user: PopulatedUser): Promise<string | null> {
  if (user.accountType === 'agent') {
    const agent = await Agent.findOne({ linkedUser: user.id }).select('_id');
    return (agent?.id as string | undefined) ?? null;
  }
  if (user.accountType === 'customer') {
    const customer = await Customer.findOne({ linkedUser: user.id }).select('_id');
    return (customer?.id as string | undefined) ?? null;
  }
  return null;
}

async function buildAccessPayload(user: PopulatedUser): Promise<AccessTokenPayload> {
  return {
    sub: user.id as string,
    roleId: user.role.id as string,
    roleName: user.role.name,
    permissions: user.role.permissions,
    accountType: user.accountType,
    profileId: await resolveProfileId(user),
    organizationId: user.organizationId ? (user.organizationId.id as string) : null,
  };
}

async function issueTokens(user: PopulatedUser): Promise<AuthTokens> {
  const accessToken = signAccessToken(await buildAccessPayload(user));
  const refreshToken = signRefreshToken({
    sub: user.id as string,
    tokenVersion: user.tokenVersion,
    jti: generateRandomToken(16),
  });

  const decoded = jwt.decode(refreshToken) as { exp?: number } | null;
  user.refreshTokenHash = hashToken(refreshToken);
  user.refreshTokenExpiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : null;
  await user.save();

  return { accessToken, refreshToken };
}

async function findActivePopulatedUserById(id: string): Promise<PopulatedUser> {
  const user = await User.findById(id)
    .populate<{ role: IRole }>('role')
    .populate('organizationId', 'name code');
  if (!user || !user.isActive) {
    throw AppError.unauthorized('Account is not available');
  }
  return user as PopulatedUser;
}

export async function login(email: string, password: string, req: Request) {
  const user = await User.findOne({ email })
    .select('+passwordHash')
    .populate<{ role: IRole }>('role')
    .populate('organizationId', 'name code');

  if (!user || !(await comparePassword(password, user.passwordHash))) {
    throw AppError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) {
    throw AppError.forbidden('This account has been deactivated');
  }

  const populatedUser = user as PopulatedUser;
  const tokens = await issueTokens(populatedUser);
  populatedUser.lastLoginAt = new Date();
  await populatedUser.save();

  await recordAuditLog({
    req,
    action: 'auth.login',
    entityType: 'User',
    entityId: populatedUser.id as string,
    actorId: populatedUser.id as string,
  });

  return { ...tokens, user: toSafeUser(populatedUser) };
}

export async function refresh(refreshToken: string, req: Request) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub)
    .select('+refreshTokenHash +refreshTokenExpiresAt')
    .populate<{ role: IRole }>('role')
    .populate('organizationId', 'name code');

  if (!user || !user.isActive) {
    throw AppError.unauthorized('Account is not available');
  }
  if (user.tokenVersion !== payload.tokenVersion) {
    throw AppError.unauthorized('Refresh token has been revoked');
  }
  if (!user.refreshTokenHash || user.refreshTokenHash !== hashToken(refreshToken)) {
    throw AppError.unauthorized('Refresh token is no longer valid');
  }
  if (!user.refreshTokenExpiresAt || user.refreshTokenExpiresAt.getTime() < Date.now()) {
    throw AppError.unauthorized('Refresh token has expired');
  }

  const populatedUser = user as PopulatedUser;
  const tokens = await issueTokens(populatedUser);

  await recordAuditLog({
    req,
    action: 'auth.token_refreshed',
    entityType: 'User',
    entityId: populatedUser.id as string,
    actorId: populatedUser.id as string,
  });

  return { ...tokens, user: toSafeUser(populatedUser) };
}

export async function logout(userId: string, req: Request): Promise<void> {
  const user = await User.findById(userId);
  if (!user) return;

  user.refreshTokenHash = null;
  user.refreshTokenExpiresAt = null;
  await user.save();

  await recordAuditLog({
    req,
    action: 'auth.logout',
    entityType: 'User',
    entityId: userId,
    actorId: userId,
  });
}

export async function forgotPassword(email: string, req: Request): Promise<void> {
  const user = await User.findOne({ email });

  if (user?.isActive) {
    const rawToken = generateRandomToken();
    user.passwordResetTokenHash = hashToken(rawToken);
    user.passwordResetExpiresAt = new Date(
      Date.now() + parseDurationToMs(env.RESET_PASSWORD_TOKEN_EXPIRES_IN),
    );
    await user.save();

    await emailProvider.send({
      to: user.email,
      subject: 'Reset your password',
      body: `Use this token to reset your password: ${rawToken} (expires in ${env.RESET_PASSWORD_TOKEN_EXPIRES_IN})`,
    });

    await recordAuditLog({
      req,
      action: 'auth.forgot_password_requested',
      entityType: 'User',
      entityId: user.id as string,
      actorId: user.id as string,
    });
  }
  // Always resolve without revealing whether the email exists.
}

export async function resetPassword(
  token: string,
  newPassword: string,
  req: Request,
): Promise<void> {
  const tokenHash = hashToken(token);
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
  }).select('+passwordResetTokenHash +passwordResetExpiresAt');

  if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt.getTime() < Date.now()) {
    throw AppError.badRequest('Invalid or expired reset token');
  }

  user.passwordHash = await hashPassword(newPassword);
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  user.refreshTokenHash = null;
  user.refreshTokenExpiresAt = null;
  user.tokenVersion += 1;
  await user.save();

  await recordAuditLog({
    req,
    action: 'auth.password_reset',
    entityType: 'User',
    entityId: user.id as string,
    actorId: user.id as string,
  });
}

export async function changePassword(userId: string, dto: ChangePasswordDto, req: Request) {
  const user = await User.findById(userId)
    .select('+passwordHash')
    .populate<{ role: IRole }>('role')
    .populate('organizationId', 'name code');

  if (!user || !(await comparePassword(dto.currentPassword, user.passwordHash))) {
    throw AppError.badRequest('Current password is incorrect');
  }

  user.passwordHash = await hashPassword(dto.newPassword);
  user.tokenVersion += 1;
  const populatedUser = user as PopulatedUser;
  const tokens = await issueTokens(populatedUser);

  await recordAuditLog({
    req,
    action: 'auth.password_changed',
    entityType: 'User',
    entityId: userId,
    actorId: userId,
  });

  return tokens;
}

export async function getProfile(userId: string) {
  const user = await findActivePopulatedUserById(userId);
  return toSafeUser(user);
}

export async function updateProfile(userId: string, dto: UpdateProfileDto, req: Request) {
  const user = await User.findById(userId)
    .populate<{ role: IRole }>('role')
    .populate('organizationId', 'name code');
  if (!user) {
    throw AppError.notFound('User not found');
  }

  if (dto.name !== undefined) user.name = dto.name;
  if (dto.mobile !== undefined) user.mobile = dto.mobile;
  await user.save();

  await recordAuditLog({
    req,
    action: 'auth.profile_updated',
    entityType: 'User',
    entityId: userId,
    actorId: userId,
  });

  return toSafeUser(user as PopulatedUser);
}
