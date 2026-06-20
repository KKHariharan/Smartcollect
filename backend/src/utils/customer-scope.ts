import type { Request } from 'express';
import type { Types } from 'mongoose';
import { Customer } from '../models/Customer';
import { AppError } from './app-error';
import { getAccessScope } from './access-scope';

/**
 * Resolves a Mongo filter fragment that scopes any document with a
 * `customer` field to what the requesting account is allowed to see:
 * Admins (and other non agent/customer account types) see everything,
 * Agents see only their assigned customers' records, and Customers see
 * only their own.
 */
export async function resolveScopedCustomerFilter(req: Request): Promise<Record<string, unknown>> {
  const scope = getAccessScope(req);
  if (scope.accountType === 'customer') {
    return { customer: scope.profileId };
  }
  if (scope.accountType === 'agent') {
    const customerIds = await Customer.find({ assignedAgent: scope.profileId }).distinct('_id');
    return { customer: { $in: customerIds } };
  }
  return {};
}

type OrganizationIdLike = Types.ObjectId | string | { _id: Types.ObjectId | string } | null | undefined;

/**
 * Throws a 403 when a fetched resource's organizationId doesn't match the
 * caller's own organization. Super Admins are exempt. Used after a row has
 * already been fetched (via row-level ownership scoping, which yields a 404
 * on a real miss) so that "exists, but not yours" is distinguishable from
 * "doesn't exist" — the former is an access-denied case, the latter isn't.
 *
 * Accepts either a raw ObjectId/string or an already-`.populate()`d
 * organization document (some callers populate `organizationId` with
 * `name code` for display before this check runs).
 */
export function assertOrganizationAccess(resourceOrganizationId: OrganizationIdLike, req: Request): void {
  const scope = getAccessScope(req);
  if (scope.accountType === 'super_admin') return;
  const resourceOrgId =
    resourceOrganizationId && typeof resourceOrganizationId === 'object' && '_id' in resourceOrganizationId
      ? resourceOrganizationId._id
      : resourceOrganizationId;
  if (!resourceOrgId || String(resourceOrgId) !== String(scope.organizationId)) {
    throw AppError.forbidden('Access denied');
  }
}
