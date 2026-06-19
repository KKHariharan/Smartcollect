import { Schema, model, Types, type Document, type Model } from 'mongoose';
import {
  softDeletePlugin,
  type SoftDeleteFields,
  type SoftDeleteMethods,
} from './plugins/soft-delete.plugin';

export const EMI_TYPES = ['daily', 'weekly', 'monthly'] as const;
export type EmiType = (typeof EMI_TYPES)[number];

export const LOAN_STATUSES = ['pending', 'approved', 'rejected', 'active', 'closed'] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

export interface ILoan extends Document, SoftDeleteFields, SoftDeleteMethods {
  loanNumber: string;
  customer: Types.ObjectId;
  principalAmount: number;
  interestRate: number;
  totalInstallments: number;
  emiType: EmiType;
  processingFee: number;
  penaltyChargePerDay: number;
  totalInterest: number;
  totalPayable: number;
  status: LoanStatus;
  createdBy: Types.ObjectId;
  approvedBy: Types.ObjectId | null;
  approvedAt: Date | null;
  rejectedBy: Types.ObjectId | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  disbursedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const loanSchema = new Schema<ILoan>(
  {
    loanNumber: { type: String, required: true, unique: true, trim: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    principalAmount: { type: Number, required: true, min: 1 },
    interestRate: { type: Number, required: true, min: 0 },
    totalInstallments: { type: Number, required: true, min: 1 },
    emiType: { type: String, enum: EMI_TYPES, required: true },
    processingFee: { type: Number, default: 0, min: 0 },
    penaltyChargePerDay: { type: Number, default: 0, min: 0 },
    totalInterest: { type: Number, default: 0 },
    totalPayable: { type: Number, default: 0 },
    status: { type: String, enum: LOAN_STATUSES, default: 'pending', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
    disbursedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

loanSchema.plugin(softDeletePlugin);

export const Loan: Model<ILoan> = model<ILoan>('Loan', loanSchema);
