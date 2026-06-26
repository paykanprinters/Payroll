import type { MockPayslip } from "@/lib/mock-data-interfaces";

/**
 * Employer Skills Development Levy (SDL) is 1% of leviable remuneration, paid by
 * the EMPLOYER to SARS. It is never deducted from the employee. This helper reads
 * the employer SDL figure off a payslip for statutory reporting (EMP201 / IRP5).
 *
 * Resolution order:
 *  1. `employerSdl` — set by the payroll engine for payslips generated after COMP-01.
 *  2. Legacy "SDL" line inside `deductionsBreakdown` — payslips generated BEFORE
 *     COMP-01 incorrectly stored SDL as an employee deduction; we still surface
 *     that amount for historical reporting accuracy.
 *  3. `0` — no SDL information available (e.g. SDL-exempt employer).
 */
export const getPayslipEmployerSdl = (payslip: Pick<MockPayslip, "employerSdl" | "deductionsBreakdown">): number => {
  if (typeof payslip.employerSdl === "number") return payslip.employerSdl;
  const legacy = (payslip.deductionsBreakdown || []).find(
    (d) => (d?.name || "").trim() === "SDL"
  )?.amount;
  return typeof legacy === "number" ? legacy : 0;
};

/** Sum employer SDL across a set of payslips. */
export const sumEmployerSdl = (
  payslips: Pick<MockPayslip, "employerSdl" | "deductionsBreakdown">[]
): number => payslips.reduce((sum, p) => sum + getPayslipEmployerSdl(p), 0);
