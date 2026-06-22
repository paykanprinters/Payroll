import { format, isSameMonth, isSameYear, parseISO } from "date-fns";
import type { LeaveEntry, MockPayslip } from "@/lib/mock-data-interfaces";

export type ReportPeriodType = "monthly" | "yearly";
export type ReportAuditLevel = "minimal" | "standard" | "detailed";

export interface ReportsAdminSummary {
  payslipCount: number;
  employeeCount: number;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  statutoryTotal: number;
}

export function getReportPeriodLabel(
  selectedDate: Date | undefined,
  periodType: ReportPeriodType
): string {
  if (!selectedDate) return "All periods";
  return periodType === "monthly" ? format(selectedDate, "MMMM yyyy") : format(selectedDate, "yyyy");
}

function payslipPeriodStart(p: MockPayslip): Date | null {
  const start = p.payPeriod?.split(" - ")?.[0];
  if (!start) return null;
  try {
    const d = parseISO(start);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function filterPayslipsForReportPeriod(
  payslips: MockPayslip[],
  selectedDate: Date | undefined,
  periodType: ReportPeriodType
): MockPayslip[] {
  if (!selectedDate) return payslips;

  return payslips.filter((p) => {
    const d = payslipPeriodStart(p);
    if (!d) return false;
    if (periodType === "monthly") {
      return isSameMonth(d, selectedDate) && isSameYear(d, selectedDate);
    }
    return isSameYear(d, selectedDate);
  });
}

export function filterLeaveForReportPeriod(
  leaveRecords: LeaveEntry[],
  selectedDate: Date | undefined,
  periodType: ReportPeriodType
): LeaveEntry[] {
  if (!selectedDate) return leaveRecords;

  const monthStart = format(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
    "yyyy-MM-dd"
  );
  const yearStart = `${selectedDate.getFullYear()}-01-01`;
  const yearEnd = `${selectedDate.getFullYear()}-12-31`;
  const monthEnd = format(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0),
    "yyyy-MM-dd"
  );

  return leaveRecords.filter((record) => {
    if (periodType === "yearly") {
      return record.endDate >= yearStart && record.startDate <= yearEnd;
    }
    return record.endDate >= monthStart && record.startDate <= monthEnd;
  });
}

export function buildReportsAdminSummary(payslips: MockPayslip[]): ReportsAdminSummary {
  const statutoryNames = new Set(["PAYE", "UIF", "SDL"]);
  let totalGross = 0;
  let totalNet = 0;
  let totalDeductions = 0;
  let statutoryTotal = 0;
  const employeeIds = new Set<string>();

  payslips.forEach((p) => {
    employeeIds.add(p.employeeId);
    totalGross += p.grossEarnings || 0;
    totalNet += p.netPay || 0;
    totalDeductions += p.totalDeductions || 0;
    (p.deductionsBreakdown || []).forEach((d) => {
      if (statutoryNames.has(d.name)) statutoryTotal += d.amount || 0;
    });
  });

  return {
    payslipCount: payslips.length,
    employeeCount: employeeIds.size,
    totalGross,
    totalNet,
    totalDeductions,
    statutoryTotal,
  };
}
