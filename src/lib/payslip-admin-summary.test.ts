import { describe, it, expect } from "vitest";
import { buildPayslipAdminSummary } from "@/lib/payslip-admin-summary";
import type { MockPayslip } from "@/lib/mock-data-interfaces";

describe("buildPayslipAdminSummary", () => {
  it("summarizes filtered payslips", () => {
    const payslips = [
      {
        id: "p1",
        employeeId: "e1",
        payPeriod: "2026-03-01 - 2026-03-31",
        payDate: "2026-04-05",
        grossEarnings: 20000,
        totalDeductions: 3000,
        netPay: 17000,
        earningsBreakdown: [],
        deductionsBreakdown: [],
        leaveSummary: { annual: 0, sick: 0, unpaid: 0 },
        ytdGrossEarnings: 60000,
        ytdTotalDeductions: 9000,
      },
      {
        id: "p2",
        employeeId: "e2",
        payPeriod: "2026-03-01 - 2026-03-31",
        payDate: "2026-04-05",
        grossEarnings: 15000,
        totalDeductions: 2000,
        netPay: 13000,
        earningsBreakdown: [],
        deductionsBreakdown: [],
        leaveSummary: { annual: 0, sick: 0, unpaid: 0 },
        ytdGrossEarnings: 45000,
        ytdTotalDeductions: 6000,
      },
    ] as MockPayslip[];

    expect(buildPayslipAdminSummary(payslips)).toEqual({
      count: 2,
      gross: 35000,
      net: 30000,
      deductions: 5000,
      uniqueEmployees: 2,
    });
  });
});
