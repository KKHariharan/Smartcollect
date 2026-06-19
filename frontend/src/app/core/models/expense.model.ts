export type ExpenseCategory =
  | 'salary'
  | 'rent'
  | 'fuel'
  | 'internet'
  | 'utilities'
  | 'miscellaneous';

export interface Expense {
  _id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description?: string;
  createdBy: { _id: string; name: string } | string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpensePayload {
  category: ExpenseCategory;
  amount: number;
  date?: string;
  description?: string;
}

export type UpdateExpensePayload = Partial<CreateExpensePayload>;

export interface ExpenseSummary {
  grandTotal: number;
  byCategory: { category: ExpenseCategory; total: number; count: number }[];
}
