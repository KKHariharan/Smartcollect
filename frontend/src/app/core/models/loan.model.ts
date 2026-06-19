export type EmiType = 'daily' | 'weekly' | 'monthly';
export type LoanStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'closed';
export type EmiInstallmentStatus = 'pending' | 'partial' | 'paid';

export interface LoanCustomerRef {
  _id: string;
  name: string;
  customerCode: string;
  mobile: string;
}

export interface Loan {
  _id: string;
  loanNumber: string;
  customer: LoanCustomerRef | string;
  principalAmount: number;
  interestRate: number;
  totalInstallments: number;
  emiType: EmiType;
  processingFee: number;
  penaltyChargePerDay: number;
  totalInterest: number;
  totalPayable: number;
  status: LoanStatus;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  disbursedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoanPayload {
  customer: string;
  principalAmount: number;
  interestRate: number;
  totalInstallments: number;
  emiType: EmiType;
  processingFee?: number;
  penaltyChargePerDay?: number;
}

export type UpdateLoanPayload = Partial<Omit<CreateLoanPayload, 'customer'>>;

export interface EmiInstallment {
  _id: string;
  loan: string;
  installmentNumber: number;
  dueDate: string;
  principalComponent: number;
  interestComponent: number;
  amountDue: number;
  amountPaid: number;
  status: EmiInstallmentStatus;
  paidAt: string | null;
  isOverdue: boolean;
}
