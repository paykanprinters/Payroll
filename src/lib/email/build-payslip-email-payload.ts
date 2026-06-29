import type { MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PayslipEmailPayload {
  companyName: string;
  employee: { name: string; email: string };
  payslip: {
    periodLabel: string;
    netPay: number;
    grossEarnings: number;
    totalDeductions: number;
  };
  pdfFilename: string;
}

export type BuildPayslipEmailResult =
  | { ok: true; payload: PayslipEmailPayload }
  | { ok: false; reason: string };

export function isValidEmail(value: string | undefined | null): boolean {
  return !!value && EMAIL_RE.test(value.trim());
}

/** Human-friendly label for a payslip's pay period ("2026-01-14 - 2026-01-20"). */
export function formatPeriodLabel(payPeriod: string): string {
  return (payPeriod || "").split(" - ").join(" – ").trim();
}

/**
 * Builds the structured payload sent to the send-payslip-email edge function.
 * Pure and side-effect free so it can be unit tested without a network/PDF.
 */
export function buildPayslipEmailPayload(
  employee: MockEmployee,
  payslip: MockPayslip,
  companyName: string
): BuildPayslipEmailResult {
  const email = employee.email?.trim();
  if (!isValidEmail(email)) {
    return { ok: false, reason: "no-email" };
  }
  if (!payslip.payPeriod) {
    return { ok: false, reason: "no-period" };
  }

  const name = `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() || "Employee";
  const periodLabel = formatPeriodLabel(payslip.payPeriod);
  const safePeriod = payslip.payPeriod.replace(/[^0-9A-Za-z_-]+/g, "_");

  return {
    ok: true,
    payload: {
      companyName: companyName?.trim() || "Payroll",
      employee: { name, email: email as string },
      payslip: {
        periodLabel,
        netPay: Number(payslip.netPay ?? 0),
        grossEarnings: Number(payslip.grossEarnings ?? 0),
        totalDeductions: Number(payslip.totalDeductions ?? 0),
      },
      pdfFilename: `payslip-${name.replace(/\s+/g, "-").toLowerCase()}-${safePeriod}.pdf`,
    },
  };
}
