import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { AccountType } from '../models/User';

export interface AccessTokenPayload {
  sub: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  accountType: AccountType;
  /** Linked Agent/Customer profile id, when accountType is 'agent' or 'customer'. */
  profileId: string | null;
  /** Owning Organization id; null only for accountType 'super_admin'. */
  organizationId: string | null;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
  jti: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
