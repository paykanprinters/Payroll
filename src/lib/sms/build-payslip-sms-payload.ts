import type { MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";
import { normalizeSaMsisdn } from "@/lib/sms/normalize-sa-msisdn";
import { formatPeriodLabel } from "@/lib/email/build-payslip-email-payload";

export interface PayslipSmsPayload {
  companyName: string;
  employee: { name: string; phone: string };
  payslip: { periodLabel: string; netPay: number };
}

export type BuildPayslipSmsResult =
  | { ok: true; payload: PayslipSmsPayload }
  | { ok: false; reason: string };

/**
 * Builds the payload sent to the send-sms edge function for a payslip-ready alert.
 * Pure and side-effect free for unit testing.
 */
export function buildPayslipSmsPayload(
  employee: MockEmployee,
  payslip: MockPayslip,
  companyName: string
): BuildPayslipSmsResult {
  const phone = normalizeSaMsisdn(employee.phoneNumber);
  if (!phone) {
    return { ok: false, reason: "no-phone" };
  }
  if (!payslip.payPeriod) {
    return { ok: false, reason: "no-period" };
  }

  const name = `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() || "Employee";

  return {
    ok: true,
    payload: {
      companyName: companyName?.trim() || "Payroll",
      employee: { name, phone },
      payslip: {
        periodLabel: formatPeriodLabel(payslip.payPeriod),
        netPay: Number(payslip.netPay ?? 0),
      },
    },
  };
}
