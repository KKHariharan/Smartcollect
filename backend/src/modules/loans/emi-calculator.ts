import type { EmiType } from '../../models/Loan';

export interface EmiCalculationInput {
  principalAmount: number;
  interestRate: number;
  totalInstallments: number;
  emiType: EmiType;
  startDate: Date;
}

export interface GeneratedInstallment {
  installmentNumber: number;
  dueDate: Date;
  principalComponent: number;
  interestComponent: number;
  amountDue: number;
}

export interface EmiCalculationResult {
  totalInterest: number;
  totalPayable: number;
  installments: GeneratedInstallment[];
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function addPeriod(date: Date, emiType: EmiType, periods: number): Date {
  const result = new Date(date);
  if (emiType === 'daily') {
    result.setDate(result.getDate() + periods);
  } else if (emiType === 'weekly') {
    result.setDate(result.getDate() + periods * 7);
  } else {
    result.setMonth(result.getMonth() + periods);
  }
  return result;
}

/**
 * Flat-rate (simple interest) amortization, the common model for microfinance/
 * collection-style lending: interest is computed once on the principal for the
 * full tenure, then split evenly across installments. The final installment
 * absorbs any rounding remainder so the schedule always sums exactly to
 * totalPayable.
 */
export function generateEmiSchedule(input: EmiCalculationInput): EmiCalculationResult {
  const { principalAmount, interestRate, totalInstallments, emiType, startDate } = input;

  const totalInterest = roundToCents(principalAmount * (interestRate / 100));
  const totalPayable = roundToCents(principalAmount + totalInterest);

  const basePrincipalShare = roundToCents(principalAmount / totalInstallments);
  const baseInterestShare = roundToCents(totalInterest / totalInstallments);
  const baseInstallmentAmount = roundToCents(basePrincipalShare + baseInterestShare);

  const installments: GeneratedInstallment[] = [];
  let principalAllocated = 0;
  let interestAllocated = 0;

  for (let i = 1; i <= totalInstallments; i += 1) {
    const isLast = i === totalInstallments;
    const principalComponent = isLast
      ? roundToCents(principalAmount - principalAllocated)
      : basePrincipalShare;
    const interestComponent = isLast
      ? roundToCents(totalInterest - interestAllocated)
      : baseInterestShare;

    principalAllocated = roundToCents(principalAllocated + principalComponent);
    interestAllocated = roundToCents(interestAllocated + interestComponent);

    installments.push({
      installmentNumber: i,
      dueDate: addPeriod(startDate, emiType, i),
      principalComponent,
      interestComponent,
      amountDue: isLast
        ? roundToCents(totalPayable - baseInstallmentAmount * (totalInstallments - 1))
        : baseInstallmentAmount,
    });
  }

  return { totalInterest, totalPayable, installments };
}
