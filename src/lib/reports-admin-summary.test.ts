import { describe, it, expect } from "vitest";
import {
  buildReportsAdminSummary,
  filterLeaveForReportPeriod,
  filterPayslipsForReportPeriod,
  getReportPeriodLabel,
  listPayWeeks,
  payWeekForDate,
} from "@/lib/reports-admin-summary";
import type { LeaveEntry, MockPayslip } from "@/lib/mock-data-interfaces";

describe("filterPayslipsForReportPeriod", () => {
  it("filters payslips by month", () => {
    const payslips = [
      {
        id: "1",
        employeeId: "e1",
        payPeriod: "2025-06-01 - 2025-06-30",
        grossEarnings: 1000,
        netPay: 800,
      },
      {
        id: "2",
        employeeId: "e1",
        payPeriod: "2025-05-01 - 2025-05-31",
        grossEarnings: 900,
        netPay: 700,
      },
    ] as MockPayslip[];

    const filtered = filterPayslipsForReportPeriod(payslips, new Date(2025, 5, 15), "monthly");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("1");
  });
});

describe("buildReportsAdminSummary", () => {
  it("summarizes period payroll totals", () => {
    const summary = buildReportsAdminSummary([
      {
        id: "1",
        employeeId: "e1",
        payPeriod: "2025-06-01 - 2025-06-30",
        grossEarnings: 10000,
        netPay: 7500,
        totalDeductions: 2500,
        deductionsBreakdown: [{ name: "PAYE", amount: 2000 }],
      } as MockPayslip,
    ]);

    expect(summary.payslipCount).toBe(1);
    expect(summary.totalGross).toBe(10000);
    expect(summary.statutoryTotal).toBe(2000);
  });
});

describe("getReportPeriodLabel", () => {
  it("formats monthly period label", () => {
    expect(getReportPeriodLabel(new Date(2025, 5, 1), "monthly")).toBe("June 2025");
  });
});

describe("weekly report period", () => {
  const slip = (id: string, payPeriod: string) => ({ id, employeeId: id, payPeriod }) as MockPayslip;
  const payslips = [
    slip("a", "2026-10-21 - 2026-10-27"),
    slip("b", "2026-10-28 - 2026-11-03"),
    slip("c", "2026-10-28 - 2026-11-03"),
  ];

  it("lists each pay week once, newest first", () => {
    expect(listPayWeeks(payslips).map((w) => w.label)).toEqual([
      "28 Oct – 3 Nov 2026",
      "21 Oct – 27 Oct 2026",
    ]);
  });

  it("finds the pay week containing any date in it", () => {
    expect(payWeekForDate(payslips, new Date(2026, 10, 1))?.start).toBe("2026-10-28");
    expect(payWeekForDate(payslips, new Date(2026, 10, 5))).toBeNull();
  });

  it("keeps only payslips for that pay week, even when it crosses a month", () => {
    const week = filterPayslipsForReportPeriod(payslips, new Date(2026, 9, 28), "weekly");
    expect(week.map((p) => p.id)).toEqual(["b", "c"]);
    expect(getReportPeriodLabel(new Date(2026, 9, 30), "weekly", payslips)).toBe(
      "Pay week 28 Oct – 3 Nov 2026"
    );
  });

  it("keeps leave that overlaps the pay week", () => {
    const leave = [
      { id: "1", startDate: "2026-10-26", endDate: "2026-10-28" },
      { id: "2", startDate: "2026-11-04", endDate: "2026-11-05" },
    ] as LeaveEntry[];
    const result = filterLeaveForReportPeriod(leave, new Date(2026, 9, 28), "weekly", {
      start: "2026-10-28",
      end: "2026-11-03",
    });
    expect(result.map((l) => l.id)).toEqual(["1"]);
  });
});
