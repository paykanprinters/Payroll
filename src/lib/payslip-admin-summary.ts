import { MockPayslip } from "@/lib/mock-data-interfaces";

export interface PayslipAdminSummary {
  count: number;
  gross: number;
  net: number;
  deductions: number;
  uniqueEmployees: number;
}

export function buildPayslipAdminSummary(payslips: MockPayslip[]): PayslipAdminSummary {
  const employeeIds = new Set<string>();
  let gross = 0;
  let net = 0;
  let deductions = 0;

  payslips.forEach((p) => {
    employeeIds.add(p.employeeId);
    gross += p.grossEarnings || 0;
    net += p.netPay || 0;
    deductions += p.totalDeductions || 0;
  });

  return {
    count: payslips.length,
    gross,
    net,
    deductions,
    uniqueEmployees: employeeIds.size,
  };
}
