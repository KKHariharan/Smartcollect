import { generateEmiSchedule } from '../../src/modules/loans/emi-calculator';

describe('generateEmiSchedule', () => {
  it('splits principal and interest evenly with the last installment absorbing rounding', () => {
    const result = generateEmiSchedule({
      principalAmount: 10000,
      interestRate: 12,
      totalInstallments: 10,
      emiType: 'monthly',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(result.totalInterest).toBeCloseTo(1200, 2);
    expect(result.totalPayable).toBeCloseTo(11200, 2);
    expect(result.installments).toHaveLength(10);

    const sumOfInstallments = result.installments.reduce((sum, i) => sum + i.amountDue, 0);
    expect(sumOfInstallments).toBeCloseTo(result.totalPayable, 2);

    const sumOfPrincipal = result.installments.reduce((sum, i) => sum + i.principalComponent, 0);
    expect(sumOfPrincipal).toBeCloseTo(10000, 2);
  });

  it('generates monthly due dates one month apart', () => {
    const result = generateEmiSchedule({
      principalAmount: 1000,
      interestRate: 10,
      totalInstallments: 3,
      emiType: 'monthly',
      startDate: new Date('2026-01-15T00:00:00.000Z'),
    });

    expect(result.installments[0]?.dueDate.getUTCMonth()).toBe(1);
    expect(result.installments[1]?.dueDate.getUTCMonth()).toBe(2);
    expect(result.installments[2]?.dueDate.getUTCMonth()).toBe(3);
  });

  it('generates daily due dates one day apart', () => {
    const result = generateEmiSchedule({
      principalAmount: 500,
      interestRate: 5,
      totalInstallments: 5,
      emiType: 'daily',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(result.installments[0]?.dueDate.getUTCDate()).toBe(2);
    expect(result.installments[4]?.dueDate.getUTCDate()).toBe(6);
  });

  it('handles a non-evenly-divisible principal without losing or gaining money', () => {
    const result = generateEmiSchedule({
      principalAmount: 1000,
      interestRate: 7,
      totalInstallments: 3,
      emiType: 'weekly',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
    });

    const sumOfInstallments = result.installments.reduce((sum, i) => sum + i.amountDue, 0);
    expect(sumOfInstallments).toBeCloseTo(result.totalPayable, 2);
  });
});
