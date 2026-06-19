import { Schema, model, Types, type Document, type Model } from 'mongoose';

export const EMI_INSTALLMENT_STATUSES = ['pending', 'partial', 'paid'] as const;
export type EmiInstallmentStatus = (typeof EMI_INSTALLMENT_STATUSES)[number];

export interface IEmiSchedule extends Document {
  loan: Types.ObjectId;
  installmentNumber: number;
  dueDate: Date;
  principalComponent: number;
  interestComponent: number;
  amountDue: number;
  amountPaid: number;
  status: EmiInstallmentStatus;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const emiScheduleSchema = new Schema<IEmiSchedule>(
  {
    loan: { type: Schema.Types.ObjectId, ref: 'Loan', required: true, index: true },
    installmentNumber: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    principalComponent: { type: Number, required: true },
    interestComponent: { type: Number, required: true },
    amountDue: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    status: { type: String, enum: EMI_INSTALLMENT_STATUSES, default: 'pending', index: true },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

emiScheduleSchema.index({ loan: 1, installmentNumber: 1 }, { unique: true });

export const EmiSchedule: Model<IEmiSchedule> = model<IEmiSchedule>(
  'EmiSchedule',
  emiScheduleSchema,
);
