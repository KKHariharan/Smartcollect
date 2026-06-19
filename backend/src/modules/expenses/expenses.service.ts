import type { Request } from 'express';
import type { FilterQuery } from 'mongoose';
import { Expense, type IExpense } from '../../models/Expense';
import { AppError } from '../../utils/app-error';
import { recordAuditLog } from '../../middleware/audit';
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

export async function listExpenses(query: ListExpensesQueryDto) {
  const filter: FilterQuery<IExpense> = {};
  if (query.category) filter.category = query.category;
  applyDateRange(filter, query.from, query.to);

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

export async function getExpenseById(id: string) {
  const expense = await Expense.findById(id).populate('createdBy', 'name');
  if (!expense) {
    throw AppError.notFound('Expense not found');
  }
  return expense;
}

export async function createExpense(dto: CreateExpenseDto, req: Request) {
  if (!req.user) throw AppError.unauthorized();

  const expense = await Expense.create({ ...dto, createdBy: req.user.sub });

  await recordAuditLog({
    req,
    action: 'expense.created',
    entityType: 'Expense',
    entityId: expense.id as string,
    metadata: { category: dto.category, amount: dto.amount },
  });

  return getExpenseById(expense.id as string);
}

export async function updateExpense(id: string, dto: UpdateExpenseDto, req: Request) {
  const expense = await Expense.findById(id);
  if (!expense) {
    throw AppError.notFound('Expense not found');
  }

  Object.assign(expense, dto);
  await expense.save();

  await recordAuditLog({
    req,
    action: 'expense.updated',
    entityType: 'Expense',
    entityId: id,
    metadata: { fields: Object.keys(dto) },
  });

  return getExpenseById(id);
}

export async function deleteExpense(id: string, req: Request): Promise<void> {
  const expense = await Expense.findById(id);
  if (!expense) {
    throw AppError.notFound('Expense not found');
  }

  await expense.softDelete();

  await recordAuditLog({
    req,
    action: 'expense.deleted',
    entityType: 'Expense',
    entityId: id,
  });
}

export async function getExpenseSummary(query: ExpenseSummaryQueryDto) {
  const filter: FilterQuery<IExpense> = {};
  applyDateRange(filter, query.from, query.to);

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
