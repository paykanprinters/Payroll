import { describe, it, expect } from "vitest";
import {
  buildReportsAdminSummary,
  filterPayslipsForReportPeriod,
  getReportPeriodLabel,
} from "@/lib/reports-admin-summary";
import type { MockPayslip } from "@/lib/mock-data-interfaces";

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
