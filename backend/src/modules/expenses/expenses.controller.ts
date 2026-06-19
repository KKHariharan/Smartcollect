import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/api-response';
import * as expensesService from './expenses.service';
import type { CreateExpenseDto, ListExpensesQueryDto, UpdateExpenseDto } from './expenses.dto';

export const listExpenses = asyncHandler(async (req: Request, res: Response) => {
  const result = await expensesService.listExpenses(req.query as unknown as ListExpensesQueryDto);
  sendSuccess(res, result, 'Expenses retrieved');
});

export const getExpense = asyncHandler(async (req: Request, res: Response) => {
  const expense = await expensesService.getExpenseById(req.params.id as string);
  sendSuccess(res, expense, 'Expense retrieved');
});

export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  const expense = await expensesService.createExpense(req.body as CreateExpenseDto, req);
  sendSuccess(res, expense, 'Expense created', 201);
});

export const updateExpense = asyncHandler(async (req: Request, res: Response) => {
  const expense = await expensesService.updateExpense(
    req.params.id as string,
    req.body as UpdateExpenseDto,
    req,
  );
  sendSuccess(res, expense, 'Expense updated');
});

export const deleteExpense = asyncHandler(async (req: Request, res: Response) => {
  await expensesService.deleteExpense(req.params.id as string, req);
  sendSuccess(res, null, 'Expense deleted');
});

export const getExpenseSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await expensesService.getExpenseSummary(req.query);
  sendSuccess(res, summary, 'Expense summary retrieved');
});
