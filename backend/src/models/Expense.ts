import { Schema, model, Types, type Document, type Model } from 'mongoose';
import {
  softDeletePlugin,
  type SoftDeleteFields,
  type SoftDeleteMethods,
} from './plugins/soft-delete.plugin';

export const EXPENSE_CATEGORIES = [
  'salary',
  'rent',
  'fuel',
  'internet',
  'utilities',
  'miscellaneous',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface IExpense extends Document, SoftDeleteFields, SoftDeleteMethods {
  category: ExpenseCategory;
  amount: number;
  date: Date;
  description?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, required: true, default: () => new Date(), index: true },
    description: { type: String, trim: true, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

expenseSchema.plugin(softDeletePlugin);

export const Expense: Model<IExpense> = model<IExpense>('Expense', expenseSchema);
