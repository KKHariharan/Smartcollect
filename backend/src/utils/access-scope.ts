import type { Request } from 'express';
import { AppError } from './app-error';
import type { AccountType } from '../models/User';

export interface AccessScope {
  accountType: AccountType;
  profileId: string | null;
  organizationId: string | null;
}

export function getAccessScope(req: Request): AccessScope {
  if (!req.user) {
    throw AppError.unauthorized();
  }
  return {
    accountType: req.user.accountType,
    profileId: req.user.profileId,
    organizationId: req.user.organizationId,
  };
}
