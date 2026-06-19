export type PaymentMode = 'cash' | 'upi' | 'bank_transfer' | 'card';

export interface Collection {
  _id: string;
  receiptNumber: string;
  customer: { _id: string; name: string; customerCode: string; mobile: string } | string;
  loan: { _id: string; loanNumber: string } | string;
  collectedBy: { _id: string; name: string } | string;
  collectionDate: string;
  amount: number;
  paymentMode: PaymentMode;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollectionPayload {
  customer: string;
  loan: string;
  amount: number;
  paymentMode: PaymentMode;
  collectionDate?: string;
  notes?: string;
}

export interface PendingInstallment {
  emiId: string;
  installmentNumber: number;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  status: string;
  isOverdue: boolean;
  loan: { id: string; loanNumber: string };
  customer: { id: string; name: string; customerCode: string; mobile: string };
}
