import { format, isSameMonth, isSameYear, parseISO } from "date-fns";
import type { LeaveEntry, MockPayslip } from "@/lib/mock-data-interfaces";

export type ReportPeriodType = "weekly" | "monthly" | "yearly";
export type ReportAuditLevel = "minimal" | "standard" | "detailed";

export interface PayWeekOption {
  /** yyyy-MM-dd */
  start: string;
  /** yyyy-MM-dd */
  end: string;
  label: string;
}

const isoDay = (d: Date) => format(d, "yyyy-MM-dd");

export function formatPayWeekLabel(start: string, end: string): string {
  return `${format(parseISO(start), "d MMM")} – ${format(parseISO(end), "d MMM yyyy")}`;
}

/** Pay weeks that have payslips, newest first. */
export function listPayWeeks(payslips: MockPayslip[]): PayWeekOption[] {
  const seen = new Map<string, PayWeekOption>();
  for (const p of payslips) {
    const [start, end] = (p.payPeriod ?? "").split(" - ");
    if (!start || !end || seen.has(start)) continue;
    seen.set(start, { start, end, label: formatPayWeekLabel(start, end) });
  }
  return Array.from(seen.values()).sort((a, b) => b.start.localeCompare(a.start));
}

/** The pay week (from existing payslips) containing the date. */
export function payWeekForDate(payslips: MockPayslip[], date: Date): PayWeekOption | null {
  const day = isoDay(date);
  return listPayWeeks(payslips).find((w) => w.start <= day && day <= w.end) ?? null;
}

export function isPayslipInPayWeekOf(p: MockPayslip, date: Date): boolean {
  const [start, end] = (p.payPeriod ?? "").split(" - ");
  const day = isoDay(date);
  return !!start && !!end && start <= day && day <= end;
}

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
  periodType: ReportPeriodType,
  payslips: MockPayslip[] = []
): string {
  if (!selectedDate) return "All periods";
  if (periodType === "weekly") {
    const week = payWeekForDate(payslips, selectedDate);
    return week ? `Pay week ${week.label}` : `Pay week of ${format(selectedDate, "d MMM yyyy")}`;
  }
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

  if (periodType === "weekly") {
    return payslips.filter((p) => isPayslipInPayWeekOf(p, selectedDate));
  }

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
  periodType: ReportPeriodType,
  payWeek?: Pick<PayWeekOption, "start" | "end"> | null
): LeaveEntry[] {
  if (!selectedDate) return leaveRecords;

  if (periodType === "weekly") {
    const start = payWeek?.start ?? isoDay(selectedDate);
    const end = payWeek?.end ?? isoDay(selectedDate);
    return leaveRecords.filter((record) => record.endDate >= start && record.startDate <= end);
  }

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
