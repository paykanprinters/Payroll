/**
 * Strip trailing UUID suffixes from historical payslip breakdown labels.
 * Older generators stored names like `Loan Repayment (<uuid>)` / `Savings (<uuid>)`.
 */
export function cleanPayslipBreakdownLabel(label: string): string {
  return label
    .replace(
      /\s*\([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\)\s*$/i,
      ""
    )
    .trim();
}
