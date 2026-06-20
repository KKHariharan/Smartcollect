import type { Request } from 'express';
import { Types, type FilterQuery } from 'mongoose';
import { Expense, type IExpense } from '../../models/Expense';
import { Organization } from '../../models/Organization';
import { AppError } from '../../utils/app-error';
import { recordAuditLog } from '../../middleware/audit';
import { assertOrganizationAccess } from '../../utils/customer-scope';
import { getAccessScope } from '../../utils/access-scope';
import type {
  CreateExpenseDto,
  ExpenseSummaryQueryDto,
  ListExpensesQueryDto,
  UpdateExpenseDto,
} from './expenses.dto';

function applyDateRange(filter: FilterQuery<IExpense>, from?: Date, to?: Date): void {
  if (!from && !to) return;
  const range: Record<string, Date> = {};
  if (from) range.$gte = from;
  if (to) range.$lte = to;
  filter.date = range;
}

function applyOrgFilter(
  filter: FilterQuery<IExpense>,
  req: Request,
  queryOrganizationId?: string,
): void {
  const scope = getAccessScope(req);
  if (scope.accountType === 'super_admin') {
    if (queryOrganizationId) {
      filter.organizationId = Types.ObjectId.createFromHexString(queryOrganizationId);
    }
    return;
  }
  // Aggregation pipelines ($match) don't get Mongoose's automatic string->ObjectId
  // casting that .find()/.findOne() apply, so this must be cast explicitly or
  // getExpenseSummary's $match silently matches nothing.
  filter.organizationId = scope.organizationId
    ? Types.ObjectId.createFromHexString(scope.organizationId)
    : null;
}

async function assertOrganizationExists(organizationId: string): Promise<void> {
  const organization = await Organization.findById(organizationId);
  if (!organization) {
    throw AppError.badRequest('Selected organization does not exist');
  }
}

async function resolveOrganizationId(
  dto: { organizationId?: string },
  req: Request,
): Promise<string | null> {
  if (!req.user) throw AppError.unauthorized();
  if (req.user.accountType === 'super_admin') {
    if (!dto.organizationId) {
      throw AppError.badRequest('organizationId is required when creating as a Super Admin');
    }
    await assertOrganizationExists(dto.organizationId);
    return dto.organizationId;
  }
  return req.user.organizationId;
}

export async function listExpenses(query: ListExpensesQueryDto, req: Request) {
  const filter: FilterQuery<IExpense> = {};
  if (query.category) filter.category = query.category;
  applyDateRange(filter, query.from, query.to);
  applyOrgFilter(filter, req, query.organizationId);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Expense.find(filter)
      .populate('createdBy', 'name')
      .skip(skip)
      .limit(query.limit)
      .sort({ date: -1 }),
    Expense.countDocuments(filter),
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

export async function getExpenseById(id: string, req: Request) {
  const expense = await Expense.findById(id).populate('createdBy', 'name');
  if (!expense) {
    throw AppError.notFound('Expense not found');
  }
  assertOrganizationAccess(expense.organizationId, req);
  return expense;
}

export async function createExpense(dto: CreateExpenseDto, req: Request) {
  if (!req.user) throw AppError.unauthorized();

  const organizationId = await resolveOrganizationId(dto, req);
  const expense = await Expense.create({ ...dto, organizationId, createdBy: req.user.sub });

  await recordAuditLog({
    req,
    action: 'expense.created',
    entityType: 'Expense',
    entityId: expense.id as string,
    metadata: { category: dto.category, amount: dto.amount },
  });

  return getExpenseById(expense.id as string, req);
}

export async function updateExpense(id: string, dto: UpdateExpenseDto, req: Request) {
  const expense = await Expense.findById(id);
  if (!expense) {
    throw AppError.notFound('Expense not found');
  }
  assertOrganizationAccess(expense.organizationId, req);

  Object.assign(expense, dto);
  await expense.save();

  await recordAuditLog({
    req,
    action: 'expense.updated',
    entityType: 'Expense',
    entityId: id,
    metadata: { fields: Object.keys(dto) },
  });

  return getExpenseById(id, req);
}

export async function deleteExpense(id: string, req: Request): Promise<void> {
  const expense = await Expense.findById(id);
  if (!expense) {
    throw AppError.notFound('Expense not found');
  }
  assertOrganizationAccess(expense.organizationId, req);

  await expense.softDelete();

  await recordAuditLog({
    req,
    action: 'expense.deleted',
    entityType: 'Expense',
    entityId: id,
  });
}

export async function getExpenseSummary(query: ExpenseSummaryQueryDto, req: Request) {
  const filter: FilterQuery<IExpense> = {};
  applyDateRange(filter, query.from, query.to);
  applyOrgFilter(filter, req, query.organizationId);

  const byCategory = await Expense.aggregate<{ _id: string; total: number; count: number }>([
    { $match: filter },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);

  const grandTotal = byCategory.reduce((sum, entry) => sum + entry.total, 0);

  return {
    grandTotal,
    byCategory: byCategory.map((entry) => ({
      category: entry._id,
      total: entry.total,
      count: entry.count,
    })),
  };
}
