import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/api-response';
import * as loansService from './loans.service';
import type { CreateLoanDto, ListLoansQueryDto, RejectLoanDto, UpdateLoanDto } from './loans.dto';

export const listLoans = asyncHandler(async (req: Request, res: Response) => {
  const result = await loansService.listLoans(req.query as unknown as ListLoansQueryDto, req);
  sendSuccess(res, result, 'Loans retrieved');
});

export const getLoan = asyncHandler(async (req: Request, res: Response) => {
  const loan = await loansService.getLoanById(req.params.id as string, req);
  sendSuccess(res, loan, 'Loan retrieved');
});

export const createLoan = asyncHandler(async (req: Request, res: Response) => {
  const loan = await loansService.createLoan(req.body as CreateLoanDto, req);
  sendSuccess(res, loan, 'Loan created', 201);
});

export const updateLoan = asyncHandler(async (req: Request, res: Response) => {
  const loan = await loansService.updateLoan(
    req.params.id as string,
    req.body as UpdateLoanDto,
    req,
  );
  sendSuccess(res, loan, 'Loan updated');
});

export const approveLoan = asyncHandler(async (req: Request, res: Response) => {
  const loan = await loansService.approveLoan(req.params.id as string, req);
  sendSuccess(res, loan, 'Loan approved');
});

export const rejectLoan = asyncHandler(async (req: Request, res: Response) => {
  const loan = await loansService.rejectLoan(
    req.params.id as string,
    req.body as RejectLoanDto,
    req,
  );
  sendSuccess(res, loan, 'Loan rejected');
});

export const closeLoan = asyncHandler(async (req: Request, res: Response) => {
  const loan = await loansService.closeLoan(req.params.id as string, req);
  sendSuccess(res, loan, 'Loan closed');
});

export const getEmiSchedule = asyncHandler(async (req: Request, res: Response) => {
  const schedule = await loansService.getEmiSchedule(req.params.id as string, req);
  sendSuccess(res, schedule, 'EMI schedule retrieved');
});
