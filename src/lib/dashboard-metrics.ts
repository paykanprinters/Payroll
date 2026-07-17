import {
  eachDayOfInterval,
  format,
  isWeekend,
  parseISO,
} from "date-fns";

import type {
  LeaveEntry,
  Loan,
  MockEmployee,
  MockPayslip,
  TimesheetEntry,
} from "@/lib/mock-data-interfaces";
import type { PayrollSavingsEntry, SavingsStatus } from "@/lib/savings-types";
import { cleanPayslipBreakdownLabel } from "@/lib/payslip-label-utils";

export type MonthValue = { name: string; value: number; key: string };

function monthKeyFromMaybeDateString(value: string | undefined | null): string | null {
  if (!value) return null;

  // common format in this app: "YYYY-MM..."
  if (/^\d{4}-\d{2}/.test(value)) return value.slice(0, 7);

  try {
    const d = parseISO(value);
    if (!isNaN(d.getTime())) return format(d, "yyyy-MM");
  } catch {
    // ignore
  }

  return null;
}

export function monthLabelFromKey(monthKey: string) {
  return format(parseISO(`${monthKey}-01`), "MMM yyyy");
}

export function computeMonthlyPayrollData(payslips: MockPayslip[], opts?: { limit?: number }) {
  const m = new Map<string, number>();
  for (const p of payslips) {
    const monthKey = monthKeyFromMaybeDateString(p.payPeriod) ?? monthKeyFromMaybeDateString(p.payDate);
    if (!monthKey) continue;
    m.set(monthKey, (m.get(monthKey) || 0) + (p.grossEarnings || 0));
  }

  const rows = Array.from(m.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, payroll]) => ({ key, name: monthLabelFromKey(key), payroll }));

  if (opts?.limit && rows.length > opts.limit) return rows.slice(-opts.limit);
  return rows;
}

export function computeAverageNetPayTrend(payslips: MockPayslip[], opts?: { limit?: number }) {
  const m = new Map<string, { sum: number; count: number }>();
  for (const p of payslips) {
    const monthKey = monthKeyFromMaybeDateString(p.payPeriod) ?? monthKeyFromMaybeDateString(p.payDate);
    if (!monthKey) continue;
    const cur = m.get(monthKey) || { sum: 0, count: 0 };
    cur.sum += p.netPay || 0;
    cur.count += 1;
    m.set(monthKey, cur);
  }

  const rows = Array.from(m.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
      key,
      name: monthLabelFromKey(key),
      avgNetPay: v.count > 0 ? v.sum / v.count : 0,
    }));

  if (opts?.limit && rows.length > opts.limit) return rows.slice(-opts.limit);
  return rows;
}

export function computeDeductionsBreakdown(payslips: MockPayslip[], opts?: { top?: number }) {
  const m = new Map<string, number>();
  for (const p of payslips) {
    for (const d of p.deductionsBreakdown || []) {
      const key = cleanPayslipBreakdownLabel(d.name || "Other") || "Other";
      m.set(key, (m.get(key) || 0) + (d.amount || 0));
    }
  }

  const top = opts?.top ?? 7;
  const sorted = Array.from(m.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (sorted.length <= top) return sorted;

  const head = sorted.slice(0, top);
  const otherSum = sorted.slice(top).reduce((sum, x) => sum + x.value, 0);
  if (otherSum > 0) head.push({ name: "Other", value: otherSum });
  return head;
}

export function computeJobTitleDistribution(employees: MockEmployee[], opts?: { top?: number }) {
  const m = new Map<string, number>();
  for (const e of employees) {
    const key = (e.jobTitle || "Unspecified").trim() || "Unspecified";
    m.set(key, (m.get(key) || 0) + 1);
  }

  const top = opts?.top ?? 7;
  const sorted = Array.from(m.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (sorted.length <= top) return sorted;
  const head = sorted.slice(0, top);
  const otherSum = sorted.slice(top).reduce((sum, x) => sum + x.value, 0);
  head.push({ name: "Other", value: otherSum });
  return head;
}

export function computeSalaryDistribution(employees: MockEmployee[]) {
  const ranges = [
    { range: "R0 - R20k", min: 0, max: 20000, count: 0 },
    { range: "R20k - R40k", min: 20001, max: 40000, count: 0 },
    { range: "R40k - R60k", min: 40001, max: 60000, count: 0 },
    { range: "R60k+", min: 60001, max: Infinity, count: 0 },
  ];

  for (const e of employees) {
    const monthly = e.salary || (e.hourlyRate ? e.hourlyRate * 160 : 0);
    for (const r of ranges) {
      if (monthly >= r.min && monthly <= r.max) {
        r.count += 1;
        break;
      }
    }
  }

  return ranges.map((r) => ({ range: r.range, count: r.count }));
}

export function computeLeaveDaysTakenTrend(leaveRecords: LeaveEntry[], opts?: { limit?: number }) {
  const m = new Map<string, number>();
  for (const record of leaveRecords || []) {
    try {
      const start = parseISO(record.startDate);
      const end = parseISO(record.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) continue;

      const days = eachDayOfInterval({ start, end });
      for (const day of days) {
        if (isWeekend(day)) continue;
        const monthKey = format(day, "yyyy-MM");
        m.set(monthKey, (m.get(monthKey) || 0) + 1);
      }
    } catch {
      // ignore
    }
  }

  const rows = Array.from(m.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, days]) => ({ key, name: monthLabelFromKey(key), days }));

  if (opts?.limit && rows.length > opts.limit) return rows.slice(-opts.limit);
  return rows;
}

export function computeTimesheetStatusCounts(timesheets: TimesheetEntry[]) {
  const counts: Record<TimesheetEntry["status"], number> = {
    Draft: 0,
    Submitted: 0,
    Approved: 0,
    Locked: 0,
  };

  let totalHours = 0;
  let overtimeHours = 0;

  for (const t of timesheets) {
    counts[t.status] = (counts[t.status] || 0) + 1;
    totalHours += t.totalWorkHours || 0;
    overtimeHours += t.overtimeHours || 0;
  }

  const chartData = (Object.keys(counts) as TimesheetEntry["status"][])
    .map((k) => ({ name: k, value: counts[k] || 0 }))
    .filter((x) => x.value > 0);

  return {
    counts,
    chartData,
    totalHours,
    overtimeHours,
  };
}

export function computeSavingsStatusSummary(entries: PayrollSavingsEntry[]) {
  const counts: Record<SavingsStatus, number> = {
    arrears: 0,
    paused: 0,
    pending: 0,
    paid: 0,
  };

  let remainingBalance = 0;

  for (const e of entries) {
    counts[e.status] = (counts[e.status] || 0) + 1;
    remainingBalance += e.remainingBalance || 0;
  }

  const chartData = (Object.keys(counts) as SavingsStatus[])
    .map((k) => ({ name: k, value: counts[k] || 0 }))
    .filter((x) => x.value > 0);

  return {
    counts,
    chartData,
    remainingBalance,
  };
}

export function computeLoansOverview(loans: Loan[]) {
  const active = loans.filter((l) => l.status === "active");
  const totalLoanAmount = active.reduce((sum, l) => sum + (l.loanAmount || 0), 0);
  const totalRemaining = active.reduce((sum, l) => sum + (l.remainingBalance || 0), 0);
  const repaid = Math.max(0, totalLoanAmount - totalRemaining);
  const repaidPct = totalLoanAmount > 0 ? (repaid / totalLoanAmount) * 100 : 0;

  return {
    activeCount: active.length,
    totalLoanAmount,
    totalRemaining,
    repaid,
    repaidPct,
  };
}
