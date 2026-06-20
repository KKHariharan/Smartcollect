import type { Request } from 'express';
import { Types, type FilterQuery, type HydratedDocument } from 'mongoose';
import { Loan, type ILoan } from '../../models/Loan';
import { EmiSchedule } from '../../models/EmiSchedule';
import { Customer } from '../../models/Customer';
import { AppError } from '../../utils/app-error';
import { generateCode } from '../../utils/sequence';
import { recordAuditLog } from '../../middleware/audit';
import { getAccessScope } from '../../utils/access-scope';
import { assertOrganizationAccess, resolveScopedCustomerFilter } from '../../utils/customer-scope';
import { generateEmiSchedule } from './emi-calculator';
import type { CreateLoanDto, ListLoansQueryDto, RejectLoanDto, UpdateLoanDto } from './loans.dto';

async function findScopedLoanOrThrow(id: string, req: Request): Promise<HydratedDocument<ILoan>> {
  const loan = await Loan.findById(id);
  if (!loan) {
    throw AppError.notFound('Loan not found');
  }
  assertOrganizationAccess(loan.organizationId, req);
  return loan;
}

export async function listLoans(query: ListLoansQueryDto, req: Request) {
  const scope = getAccessScope(req);
  const scopedFilter = await resolveScopedCustomerFilter(req);
  const filter: FilterQuery<ILoan> = { ...scopedFilter };
  if (scope.accountType !== 'super_admin') filter.organizationId = scope.organizationId;
  if (query.customer) filter.customer = query.customer;
  if (query.status) filter.status = query.status;

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Loan.find(filter)
      .populate('customer', 'name customerCode mobile')
      .skip(skip)
      .limit(query.limit)
      .sort({ createdAt: -1 }),
    Loan.countDocuments(filter),
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

export async function getLoanById(id: string, req: Request) {
  const scopedFilter = await resolveScopedCustomerFilter(req);
  const loan = await Loan.findOne({ _id: id, ...scopedFilter }).populate(
    'customer',
    'name customerCode mobile',
  );
  if (!loan) {
    throw AppError.notFound('Loan not found');
  }
  assertOrganizationAccess(loan.organizationId, req);
  return loan;
}

export async function createLoan(dto: CreateLoanDto, req: Request) {
  if (!req.user) throw AppError.unauthorized();

  const customer = await Customer.findById(dto.customer);
  if (!customer) {
    throw AppError.badRequest('Customer does not exist');
  }
  assertOrganizationAccess(customer.organizationId, req);

  const loanNumber = await generateCode('LN', 'loan_seq');
  const loan = await Loan.create({
    ...dto,
    loanNumber,
    organizationId: customer.organizationId,
    createdBy: req.user.sub,
  });

  await recordAuditLog({
    req,
    action: 'loan.created',
    entityType: 'Loan',
    entityId: loan.id as string,
    metadata: { loanNumber },
  });

  return getLoanById(loan.id as string, req);
}

export async function updateLoan(id: string, dto: UpdateLoanDto, req: Request) {
  const loan = await findScopedLoanOrThrow(id, req);
  if (loan.status !== 'pending') {
    throw AppError.badRequest('Only pending loans can be edited');
  }

  Object.assign(loan, dto);
  await loan.save();

  await recordAuditLog({
    req,
    action: 'loan.updated',
    entityType: 'Loan',
    entityId: id,
    metadata: { fields: Object.keys(dto) },
  });

  return getLoanById(id, req);
}

export async function approveLoan(id: string, req: Request) {
  if (!req.user) throw AppError.unauthorized();

  const loan = await findScopedLoanOrThrow(id, req);
  if (loan.status !== 'pending') {
    throw AppError.badRequest('Only pending loans can be approved');
  }

  const now = new Date();
  const { totalInterest, totalPayable, installments } = generateEmiSchedule({
    principalAmount: loan.principalAmount,
    interestRate: loan.interestRate,
    totalInstallments: loan.totalInstallments,
    emiType: loan.emiType,
    startDate: now,
  });

  await EmiSchedule.insertMany(
    installments.map((installment) => ({
      loan: loan.id as string,
      installmentNumber: installment.installmentNumber,
      dueDate: installment.dueDate,
      principalComponent: installment.principalComponent,
      interestComponent: installment.interestComponent,
      amountDue: installment.amountDue,
    })),
  );

  loan.totalInterest = totalInterest;
  loan.totalPayable = totalPayable;
  loan.status = 'active';
  loan.approvedBy = Types.ObjectId.createFromHexString(req.user.sub);
  loan.approvedAt = now;
  loan.disbursedAt = now;
  await loan.save();

  await recordAuditLog({
    req,
    action: 'loan.approved',
    entityType: 'Loan',
    entityId: id,
    metadata: { totalPayable, installmentCount: installments.length },
  });

  return getLoanById(id, req);
}

export async function rejectLoan(id: string, dto: RejectLoanDto, req: Request) {
  if (!req.user) throw AppError.unauthorized();

  const loan = await findScopedLoanOrThrow(id, req);
  if (loan.status !== 'pending') {
    throw AppError.badRequest('Only pending loans can be rejected');
  }

  loan.status = 'rejected';
  loan.rejectedBy = Types.ObjectId.createFromHexString(req.user.sub);
  loan.rejectedAt = new Date();
  loan.rejectionReason = dto.reason;
  await loan.save();

  await recordAuditLog({
    req,
    action: 'loan.rejected',
    entityType: 'Loan',
    entityId: id,
    metadata: { reason: dto.reason },
  });

  return getLoanById(id, req);
}

export async function closeLoan(id: string, req: Request) {
  const loan = await findScopedLoanOrThrow(id, req);
  if (loan.status !== 'active') {
    throw AppError.badRequest('Only active loans can be closed');
  }

  loan.status = 'closed';
  loan.closedAt = new Date();
  await loan.save();

  await recordAuditLog({
    req,
    action: 'loan.closed',
    entityType: 'Loan',
    entityId: id,
  });

  return getLoanById(id, req);
}

export async function getEmiSchedule(id: string, req: Request) {
  await getLoanById(id, req);
  const installments = await EmiSchedule.find({ loan: id }).sort({ installmentNumber: 1 });

  const now = Date.now();
  return installments.map((installment) => ({
    ...installment.toJSON(),
    isOverdue: installment.status !== 'paid' && installment.dueDate.getTime() < now,
  }));
}
