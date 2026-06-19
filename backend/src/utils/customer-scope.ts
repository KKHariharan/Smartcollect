import type { Request } from 'express';
import { Customer } from '../models/Customer';
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
