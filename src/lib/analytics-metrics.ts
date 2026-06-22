import { format, differenceInMonths, parseISO } from "date-fns";
import type { LeaveEntry, MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";
import {
  filterPayslipsByChartPeriod,
  getChartPeriodCutoffKey,
  type DashboardChartPeriod,
} from "@/lib/dashboard-admin-summary";
import { monthLabelFromKey } from "@/lib/dashboard-metrics";

export interface AnalyticsScope {
  employees: MockEmployee[];
  payslips: MockPayslip[];
  leaveRecords: LeaveEntry[];
}

export interface AnalyticsAdminSummary {
  employeeCount: number;
  payslipCount: number;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  leaveDaysInPeriod: number;
  avgNetPay: number;
}

export interface AnalyticsChartData {
  monthlyPayrollTrend: { name: string; gross: number; net: number }[];
  compensationBreakdown: { name: string; value: number }[];
  deductionCategoryBreakdown: { name: string; value: number }[];
  employeeTurnoverTrend: { name: string; newHires: number; terminations: number }[];
  leaveTypeDistribution: { name: string; value: number }[];
  employeeSalaryDistribution: { range: string; count: number }[];
  overtimeCostTrend: { name: string; overtime: number }[];
  employeeTenureDistribution: { name: string; value: number }[];
}

function monthKeyFromPayslip(p: MockPayslip): string | null {
  const fromPeriod = p.payPeriod?.split(" - ")[0]?.slice(0, 7);
  if (fromPeriod && /^\d{4}-\d{2}$/.test(fromPeriod)) return fromPeriod;
  if (p.payDate && /^\d{4}-\d{2}/.test(p.payDate)) return p.payDate.slice(0, 7);
  return null;
}

export function getAnalyticsScope(
  employees: MockEmployee[],
  payslips: MockPayslip[],
  leaveRecords: LeaveEntry[],
  options?: { staffUserId?: string }
): AnalyticsScope {
  if (!options?.staffUserId) {
    return { employees, payslips, leaveRecords: leaveRecords || [] };
  }

  const scopedEmployees = employees.filter((emp) => emp.userId === options.staffUserId);
  const employeeIds = new Set(scopedEmployees.map((e) => e.id));

  return {
    employees: scopedEmployees,
    payslips: payslips.filter((p) => employeeIds.has(p.employeeId)),
    leaveRecords: (leaveRecords || []).filter((r) => employeeIds.has(r.employeeId)),
  };
}

export function filterLeaveByChartPeriod(
  leaveRecords: LeaveEntry[],
  period: DashboardChartPeriod
): LeaveEntry[] {
  const cutoff = getChartPeriodCutoffKey(period);
  if (!cutoff) return leaveRecords;

  const cutoffDate = `${cutoff}-01`;
  return leaveRecords.filter((record) => record.endDate >= cutoffDate || record.startDate >= cutoffDate);
}

export function applyAnalyticsPeriod(
  scope: AnalyticsScope,
  period: DashboardChartPeriod
): AnalyticsScope {
  return {
    employees: scope.employees,
    payslips: filterPayslipsByChartPeriod(scope.payslips, period),
    leaveRecords: filterLeaveByChartPeriod(scope.leaveRecords, period),
  };
}

export function buildAnalyticsAdminSummary(
  employees: MockEmployee[],
  payslips: MockPayslip[],
  leaveRecords: LeaveEntry[]
): AnalyticsAdminSummary {
  let totalGross = 0;
  let totalNet = 0;
  let totalDeductions = 0;

  payslips.forEach((p) => {
    totalGross += p.grossEarnings || 0;
    totalNet += p.netPay || 0;
    totalDeductions += p.totalDeductions || 0;
  });

  const leaveDaysInPeriod = leaveRecords.reduce((sum, r) => sum + (r.workingDays || 0), 0);

  return {
    employeeCount: employees.length,
    payslipCount: payslips.length,
    totalGross,
    totalNet,
    totalDeductions,
    leaveDaysInPeriod,
    avgNetPay: payslips.length > 0 ? totalNet / payslips.length : 0,
  };
}

export function normalizeEarningName(raw: string): string {
  const n = (raw || "").toLowerCase();
  if (n.startsWith("regular hours")) return "Regular Hours";
  if (n.startsWith("basic salary")) return "Basic Salary";
  if (n.startsWith("weekend overtime")) return "Weekend Overtime";
  if (n.startsWith("overtime")) return "Overtime";
  if (n.startsWith("public holiday (worked")) return "Public Holiday (Worked)";
  if (n.startsWith("public holiday (no timesheet")) return "Public Holiday (Not Worked)";
  if (n.startsWith("public holiday (not worked")) return "Public Holiday (Not Worked)";
  if (n.startsWith("bonus")) return "Bonus";
  return raw;
}

function limitMonthlyRows<T extends { key: string }>(rows: T[], limitMonths?: number): T[] {
  if (!limitMonths || rows.length <= limitMonths) return rows;
  return rows.slice(-limitMonths);
}

export function computeAnalyticsCharts(
  scope: AnalyticsScope,
  options?: { limitMonths?: number; includeWorkforceCharts?: boolean }
): AnalyticsChartData {
  const { employees, payslips, leaveRecords } = scope;
  const includeWorkforceCharts = options?.includeWorkforceCharts !== false;

  const monthlyDataMap = new Map<string, { gross: number; net: number }>();
  payslips.forEach((p) => {
    const monthYear = monthKeyFromPayslip(p);
    if (!monthYear) return;
    const current = monthlyDataMap.get(monthYear) || { gross: 0, net: 0 };
    monthlyDataMap.set(monthYear, {
      gross: current.gross + (p.grossEarnings || 0),
      net: current.net + (p.netPay || 0),
    });
  });

  const monthlyPayrollTrend = limitMonthlyRows(
    Array.from(monthlyDataMap.entries())
      .map(([key, data]) => ({
        key,
        name: monthLabelFromKey(key),
        gross: data.gross,
        net: data.net,
      }))
      .sort((a, b) => a.key.localeCompare(b.key)),
    options?.limitMonths
  ).map(({ name, gross, net }) => ({ name, gross, net }));

  const compensationMap = new Map<string, number>();
  payslips.forEach((p) => {
    (p.earningsBreakdown || []).forEach((e) => {
      const key = normalizeEarningName(e.name);
      compensationMap.set(key, (compensationMap.get(key) || 0) + (e.amount || 0));
    });
  });
  const compensationBreakdown = Array.from(compensationMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  const statutoryDeductions = ["PAYE", "UIF", "SDL"];
  let totalStatutory = 0;
  let totalOtherDeductions = 0;
  payslips.forEach((p) => {
    (p.deductionsBreakdown || []).forEach((d) => {
      if (statutoryDeductions.includes(d.name)) totalStatutory += d.amount || 0;
      else totalOtherDeductions += d.amount || 0;
    });
  });
  const deductionCategoryBreakdown = [
    { name: "Statutory Deductions", value: totalStatutory },
    { name: "Other Deductions", value: totalOtherDeductions },
  ].filter((x) => x.value > 0);

  const turnoverMap = new Map<string, { newHires: number; terminations: number }>();
  const currentYear = new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => format(new Date(currentYear, i, 1), "MMM yyyy"));
  months.forEach((m) => turnoverMap.set(m, { newHires: 0, terminations: 0 }));

  if (includeWorkforceCharts) {
    employees.forEach((emp) => {
      const hireMonth = format(parseISO(emp.startDate), "MMM yyyy");
      if (turnoverMap.has(hireMonth)) {
        turnoverMap.get(hireMonth)!.newHires++;
      }
      const terminationDate = (emp as MockEmployee & { terminationDate?: string }).terminationDate;
      if (terminationDate) {
        const termMonth = format(parseISO(terminationDate), "MMM yyyy");
        if (turnoverMap.has(termMonth)) {
          turnoverMap.get(termMonth)!.terminations++;
        }
      }
    });
  }

  const employeeTurnoverTrend = Array.from(turnoverMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => months.indexOf(a.name) - months.indexOf(b.name));

  const leaveTypeMap = new Map<string, number>();
  leaveRecords.forEach((record) => {
    leaveTypeMap.set(
      record.leaveType,
      (leaveTypeMap.get(record.leaveType) || 0) + (record.workingDays || 0)
    );
  });
  const leaveTypeDistribution = Array.from(leaveTypeMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  const salaryRanges = [
    { range: "R0 - R20k", min: 0, max: 20000, count: 0 },
    { range: "R20k - R40k", min: 20001, max: 40000, count: 0 },
    { range: "R40k - R60k", min: 40001, max: 60000, count: 0 },
    { range: "R60k+", min: 60001, max: Infinity, count: 0 },
  ];
  employees.forEach((emp) => {
    const effectiveSalary = emp.salary || (emp.hourlyRate ? emp.hourlyRate * 160 : 0);
    for (const range of salaryRanges) {
      if (effectiveSalary >= range.min && effectiveSalary <= range.max) {
        range.count++;
        break;
      }
    }
  });
  const employeeSalaryDistribution = salaryRanges.map((r) => ({ range: r.range, count: r.count }));

  const overtimeTrendMap = new Map<string, number>();
  payslips.forEach((p) => {
    const monthYear = monthKeyFromPayslip(p);
    if (!monthYear) return;
    const overtimeTotal = (p.earningsBreakdown || []).reduce((sum, e) => {
      const n = (e.name || "").toLowerCase();
      return sum + (n.includes("overtime") ? e.amount || 0 : 0);
    }, 0);
    overtimeTrendMap.set(monthYear, (overtimeTrendMap.get(monthYear) || 0) + overtimeTotal);
  });

  const overtimeCostTrend = limitMonthlyRows(
    Array.from(overtimeTrendMap.entries())
      .map(([key, overtime]) => ({
        key,
        name: monthLabelFromKey(key),
        overtime,
      }))
      .sort((a, b) => a.key.localeCompare(b.key)),
    options?.limitMonths
  ).map(({ name, overtime }) => ({ name, overtime }));

  const tenureRanges = [
    { name: "< 1 Year", minMonths: 0, maxMonths: 11, count: 0 },
    { name: "1-3 Years", minMonths: 12, maxMonths: 35, count: 0 },
    { name: "3-5 Years", minMonths: 36, maxMonths: 59, count: 0 },
    { name: "5+ Years", minMonths: 60, maxMonths: Infinity, count: 0 },
  ];
  const today = new Date();
  employees.forEach((emp) => {
    const monthsSinceHire = differenceInMonths(today, parseISO(emp.startDate));
    for (const range of tenureRanges) {
      if (monthsSinceHire >= range.minMonths && monthsSinceHire <= range.maxMonths) {
        range.count++;
        break;
      }
    }
  });
  const employeeTenureDistribution = tenureRanges.map((r) => ({ name: r.name, value: r.count }));

  return {
    monthlyPayrollTrend,
    compensationBreakdown,
    deductionCategoryBreakdown,
    employeeTurnoverTrend,
    leaveTypeDistribution,
    employeeSalaryDistribution,
    overtimeCostTrend,
    employeeTenureDistribution,
  };
}

export function getChartLimitForPeriod(period: DashboardChartPeriod): number | undefined {
  if (period === "3m") return 3;
  if (period === "6m") return 6;
  if (period === "12m") return 12;
  return undefined;
}
