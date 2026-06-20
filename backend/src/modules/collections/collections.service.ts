import type { Request } from 'express';
import type { FilterQuery } from 'mongoose';
import { Collection, type ICollection } from '../../models/Collection';
import { Loan } from '../../models/Loan';
import { EmiSchedule, type IEmiSchedule } from '../../models/EmiSchedule';
import { Customer } from '../../models/Customer';
import { AppError } from '../../utils/app-error';
import { generateCode } from '../../utils/sequence';
import { recordAuditLog } from '../../middleware/audit';
import { getAccessScope } from '../../utils/access-scope';
import { assertOrganizationAccess, resolveScopedCustomerFilter } from '../../utils/customer-scope';
import { whatsappProvider } from '../../providers/whatsapp.provider';
import type {
  CreateCollectionDto,
  ListCollectionsQueryDto,
  ListPendingQueryDto,
} from './collections.dto';

async function applyPaymentToSchedule(loanId: string, amount: number): Promise<boolean> {
  const installments = await EmiSchedule.find({
    loan: loanId,
    status: { $in: ['pending', 'partial'] },
  }).sort({ installmentNumber: 1 });

  const totalOutstanding = installments.reduce(
    (sum, installment) => sum + (installment.amountDue - installment.amountPaid),
    0,
  );
  if (amount > totalOutstanding + 0.01) {
    throw AppError.badRequest(
      `Amount exceeds the outstanding balance of ${totalOutstanding.toFixed(2)}`,
    );
  }

  let remaining = amount;
  for (const installment of installments) {
    if (remaining <= 0) break;
    const due = installment.amountDue - installment.amountPaid;
    const applied = Math.min(due, remaining);
    installment.amountPaid += applied;
    installment.status = installment.amountPaid >= installment.amountDue ? 'paid' : 'partial';
    installment.paidAt = new Date();
    await installment.save();
    remaining -= applied;
  }

  const remainingUnpaid = await EmiSchedule.countDocuments({
    loan: loanId,
    status: { $ne: 'paid' },
  });
  return remainingUnpaid === 0;
}

export async function listCollections(query: ListCollectionsQueryDto, req: Request) {
  const scope = getAccessScope(req);
  const scopedFilter = await resolveScopedCustomerFilter(req);
  const filter: FilterQuery<ICollection> = { ...scopedFilter };
  if (scope.accountType !== 'super_admin') filter.organizationId = scope.organizationId;
  if (query.customer) filter.customer = query.customer;
  if (query.loan) filter.loan = query.loan;
  if (query.from || query.to) {
    filter.collectionDate = {};
    if (query.from) (filter.collectionDate as Record<string, Date>).$gte = query.from;
    if (query.to) (filter.collectionDate as Record<string, Date>).$lte = query.to;
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Collection.find(filter)
      .populate('customer', 'name customerCode mobile')
      .populate('loan', 'loanNumber')
      .populate('collectedBy', 'name')
      .skip(skip)
      .limit(query.limit)
      .sort({ collectionDate: -1 }),
    Collection.countDocuments(filter),
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

export async function getCollectionById(id: string, req: Request) {
  const scopedFilter = await resolveScopedCustomerFilter(req);
  const collection = await Collection.findOne({ _id: id, ...scopedFilter })
    .populate('customer', 'name customerCode mobile')
    .populate('loan', 'loanNumber')
    .populate('collectedBy', 'name');
  if (!collection) {
    throw AppError.notFound('Collection not found');
  }
  assertOrganizationAccess(collection.organizationId, req);
  return collection;
}

export async function createCollection(dto: CreateCollectionDto, req: Request) {
  if (!req.user) throw AppError.unauthorized();

  const [customer, loan] = await Promise.all([
    Customer.findById(dto.customer),
    Loan.findById(dto.loan),
  ]);
  if (!customer) throw AppError.badRequest('Customer does not exist');
  if (!loan) throw AppError.badRequest('Loan does not exist');
  if (loan.customer.toString() !== dto.customer) {
    throw AppError.badRequest('Loan does not belong to the specified customer');
  }
  if (loan.status !== 'active') {
    throw AppError.badRequest('Collections can only be recorded against active loans');
  }
  assertOrganizationAccess(loan.organizationId, req);

  const fullyPaid = await applyPaymentToSchedule(dto.loan, dto.amount);
  if (fullyPaid) {
    loan.status = 'closed';
    loan.closedAt = new Date();
    await loan.save();
  }

  const receiptNumber = await generateCode('RCPT', 'collection_seq');
  const collection = await Collection.create({
    ...dto,
    receiptNumber,
    organizationId: loan.organizationId,
    collectedBy: req.user.sub,
    collectionDate: dto.collectionDate ?? new Date(),
  });

  await whatsappProvider.send({
    to: customer.mobile,
    body: `Dear ${customer.name}, we have received your payment of ${dto.amount} (Receipt: ${receiptNumber}). Thank you.`,
  });

  await recordAuditLog({
    req,
    action: 'collection.created',
    entityType: 'Collection',
    entityId: collection.id as string,
    metadata: { receiptNumber, amount: dto.amount, loanClosed: fullyPaid },
  });

  return getCollectionById(collection.id as string, req);
}

export interface PendingInstallmentView {
  emiId: string;
  installmentNumber: number;
  dueDate: Date;
  amountDue: number;
  amountPaid: number;
  status: IEmiSchedule['status'];
  isOverdue: boolean;
  loan: { id: string; loanNumber: string };
  customer: { id: string; name: string; customerCode: string; mobile: string };
}

export async function listPendingCollections(query: ListPendingQueryDto, req: Request) {
  const scope = getAccessScope(req);
  const scopedCustomerFilter = await resolveScopedCustomerFilter(req);
  const customerFilter: FilterQuery<{ _id: unknown; organizationId?: unknown }> = {};
  if (scopedCustomerFilter.customer) customerFilter._id = scopedCustomerFilter.customer;
  if (scope.accountType !== 'super_admin') customerFilter.organizationId = scope.organizationId;
  const loanCustomerIds = await Customer.find(customerFilter).distinct('_id');

  const now = new Date();
  const loans = await Loan.find({ customer: { $in: loanCustomerIds }, status: 'active' }).select(
    '_id loanNumber customer',
  );
  const loanIds = loans.map((loan) => loan.id as string);

  const installmentFilter: FilterQuery<IEmiSchedule> = {
    loan: { $in: loanIds },
    status: { $ne: 'paid' },
  };
  if (query.overdueOnly) {
    installmentFilter.dueDate = { $lt: now };
  }

  const skip = (query.page - 1) * query.limit;
  const [installments, total] = await Promise.all([
    EmiSchedule.find(installmentFilter).sort({ dueDate: 1 }).skip(skip).limit(query.limit),
    EmiSchedule.countDocuments(installmentFilter),
  ]);

  const loanById = new Map(loans.map((loan) => [loan.id as string, loan]));
  const customerIds = loans.map((loan) => loan.customer.toString());
  const customers = await Customer.find({ _id: { $in: customerIds } }).select(
    'name customerCode mobile',
  );
  const customerById = new Map(customers.map((customer) => [customer.id as string, customer]));

  const items: PendingInstallmentView[] = installments.map((installment) => {
    const loan = loanById.get(installment.loan.toString());
    const customer = loan ? customerById.get(loan.customer.toString()) : undefined;
    return {
      emiId: installment.id as string,
      installmentNumber: installment.installmentNumber,
      dueDate: installment.dueDate,
      amountDue: installment.amountDue,
      amountPaid: installment.amountPaid,
      status: installment.status,
      isOverdue: installment.dueDate.getTime() < now.getTime(),
      loan: { id: loan?.id as string, loanNumber: loan?.loanNumber ?? '' },
      customer: {
        id: customer?.id as string,
        name: customer?.name ?? '',
        customerCode: customer?.customerCode ?? '',
        mobile: customer?.mobile ?? '',
      },
    };
  });

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
