import { Schema, model, Types, type Document, type Model } from 'mongoose';

export const PAYMENT_MODES = ['cash', 'upi', 'bank_transfer', 'card'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export interface ICollection extends Document {
  receiptNumber: string;
  customer: Types.ObjectId;
  loan: Types.ObjectId;
  organizationId: Types.ObjectId | null;
  collectedBy: Types.ObjectId;
  collectionDate: Date;
  amount: number;
  paymentMode: PaymentMode;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const collectionSchema = new Schema<ICollection>(
  {
    receiptNumber: { type: String, required: true, unique: true, trim: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    loan: { type: Schema.Types.ObjectId, ref: 'Loan', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
    collectedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    collectionDate: { type: Date, required: true, default: () => new Date() },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMode: { type: String, enum: PAYMENT_MODES, required: true },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

export const Collection: Model<ICollection> = model<ICollection>('Collection', collectionSchema);
