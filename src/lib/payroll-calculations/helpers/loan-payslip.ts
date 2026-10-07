import type { Loan } from "@/lib/mock-data-interfaces";

export type LoanPayslipFigures = {
  /** Amount deducted for loans on this payslip. Already included in total deductions. */
  loanDeduction: number | null;
  /** Balance still outstanding after this payslip's deduction. */
  loanBalance: number | null;
};

/**
 * Figures for the payslip loan switch.
 * remainingBalance is the balance after this period's deduction has been applied.
 * Returns nulls when the employee has nothing to show.
 */
export function loanPayslipFigures(
  loans: Pick<Loan, "employeeId" | "remainingBalance">[] | null | undefined,
  employeeId: string,
  periodLoanDeduction: number
): LoanPayslipFigures {
  const mine = (loans ?? []).filter((loan) => loan.employeeId === employeeId);
  const period = Math.round((Number(periodLoanDeduction) || 0) * 100) / 100;
  const balance =
    Math.round(mine.reduce((sum, loan) => sum + (Number(loan.remainingBalance) || 0), 0) * 100) / 100;
  if (mine.length === 0 || (period === 0 && balance === 0)) {
    return { loanDeduction: null, loanBalance: null };
  }
  return { loanDeduction: period, loanBalance: balance };
}
