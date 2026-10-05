import type { MockPayslip } from "@/lib/mock-data-interfaces";

export function payslipsForPayrollRun<T extends Pick<MockPayslip, "id" | "payPeriod">>(
  payslips: T[],
  items: { payslipId?: string | null }[],
  periodStart: string,
  periodEnd: string
): T[] {
  const linkedIds = new Set(items.map((item) => item.payslipId).filter((id): id is string => !!id));
  if (linkedIds.size > 0) {
    return payslips.filter((payslip) => linkedIds.has(payslip.id));
  }
  const periodKey = `${periodStart.slice(0, 10)} - ${periodEnd.slice(0, 10)}`;
  return payslips.filter((payslip) => payslip.payPeriod === periodKey);
}
