import { describe, it, expect } from "vitest";
import {
  applyAnalyticsPeriod,
  buildAnalyticsAdminSummary,
  computeAnalyticsCharts,
  getAnalyticsScope,
  normalizeEarningName,
} from "@/lib/analytics-metrics";
import type { LeaveEntry, MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";

describe("normalizeEarningName", () => {
  it("normalizes overtime labels", () => {
    expect(normalizeEarningName("overtime hours")).toBe("Overtime");
  });
});

describe("getAnalyticsScope", () => {
  it("scopes data to a staff user", () => {
    const employees = [
      { id: "e1", userId: "u1", firstName: "A", lastName: "B", startDate: "2024-01-01" },
      { id: "e2", userId: "u2", firstName: "C", lastName: "D", startDate: "2024-01-01" },
    ] as MockEmployee[];
    const payslips = [
      { id: "p1", employeeId: "e1", payPeriod: "2025-01-01 - 2025-01-31", grossEarnings: 1000, netPay: 800 },
      { id: "p2", employeeId: "e2", payPeriod: "2025-01-01 - 2025-01-31", grossEarnings: 2000, netPay: 1600 },
    ] as MockPayslip[];

    const scope = getAnalyticsScope(employees, payslips, [], { staffUserId: "u1" });
    expect(scope.employees).toHaveLength(1);
    expect(scope.payslips).toHaveLength(1);
  });
});

describe("buildAnalyticsAdminSummary", () => {
  it("summarizes scoped payroll metrics", () => {
    const summary = buildAnalyticsAdminSummary(
      [{ id: "e1", startDate: "2024-01-01" } as MockEmployee],
      [
        {
          id: "p1",
          employeeId: "e1",
          payPeriod: "2025-06-01 - 2025-06-30",
          grossEarnings: 10000,
          netPay: 7500,
          totalDeductions: 2500,
        } as MockPayslip,
      ],
      [{ id: "l1", employeeId: "e1", leaveType: "Annual Leave", workingDays: 3 } as LeaveEntry]
    );

    expect(summary.employeeCount).toBe(1);
    expect(summary.payslipCount).toBe(1);
    expect(summary.totalGross).toBe(10000);
    expect(summary.totalNet).toBe(7500);
    expect(summary.leaveDaysInPeriod).toBe(3);
  });
});

describe("applyAnalyticsPeriod", () => {
  it("filters payslips and leave by chart period", () => {
    const scope = {
      employees: [],
      payslips: [
        { id: "p1", employeeId: "e1", payPeriod: "2020-01-01 - 2020-01-31", grossEarnings: 1, netPay: 1 },
        { id: "p2", employeeId: "e1", payPeriod: "2099-06-01 - 2099-06-30", grossEarnings: 2, netPay: 2 },
      ] as MockPayslip[],
      leaveRecords: [
        { id: "l1", employeeId: "e1", startDate: "2020-01-01", endDate: "2020-01-05", leaveType: "Sick Leave" },
        { id: "l2", employeeId: "e1", startDate: "2099-06-01", endDate: "2099-06-05", leaveType: "Annual Leave" },
      ] as LeaveEntry[],
    };

    const filtered = applyAnalyticsPeriod(scope, "12m");
    expect(filtered.payslips.some((p) => p.id === "p1")).toBe(false);
    expect(filtered.leaveRecords.some((l) => l.id === "l1")).toBe(false);
  });
});

describe("computeAnalyticsCharts", () => {
  it("builds monthly payroll trend from payslips", () => {
    const charts = computeAnalyticsCharts({
      employees: [{ id: "e1", startDate: "2024-01-01", salary: 25000 } as MockEmployee],
      payslips: [
        {
          id: "p1",
          employeeId: "e1",
          payPeriod: "2025-06-01 - 2025-06-30",
          grossEarnings: 10000,
          netPay: 8000,
          earningsBreakdown: [{ name: "Basic Salary", amount: 10000 }],
          deductionsBreakdown: [{ name: "PAYE", amount: 1500 }],
        } as MockPayslip,
      ],
      leaveRecords: [],
    });

    expect(charts.monthlyPayrollTrend.length).toBeGreaterThan(0);
    expect(charts.compensationBreakdown[0].name).toBe("Basic Salary");
  });
});
