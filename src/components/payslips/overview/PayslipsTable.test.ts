import { describe, it, expect } from "vitest";
import { groupPayslipsByEmployee } from "@/components/payslips/overview/group-payslips";
import type { MockPayslip } from "@/lib/mock-data-interfaces";

describe("groupPayslipsByEmployee", () => {
  it("groups and sorts payslips by employee name with newest period first", () => {
    const payslips = [
      {
        id: "p2",
        employeeId: "e1",
        payPeriod: "2026-02-01 - 2026-02-28",
        payDate: "2026-03-05",
        grossEarnings: 1000,
        totalDeductions: 100,
        netPay: 900,
        earningsBreakdown: [],
        deductionsBreakdown: [],
        leaveSummary: { annual: 0, sick: 0, unpaid: 0 },
        ytdGrossEarnings: 0,
        ytdTotalDeductions: 0,
      },
      {
        id: "p1",
        employeeId: "e1",
        payPeriod: "2026-03-01 - 2026-03-31",
        payDate: "2026-04-05",
        grossEarnings: 2000,
        totalDeductions: 200,
        netPay: 1800,
        earningsBreakdown: [],
        deductionsBreakdown: [],
        leaveSummary: { annual: 0, sick: 0, unpaid: 0 },
        ytdGrossEarnings: 0,
        ytdTotalDeductions: 0,
      },
      {
        id: "p3",
        employeeId: "e2",
        payPeriod: "2026-03-01 - 2026-03-31",
        payDate: "2026-04-05",
        grossEarnings: 1500,
        totalDeductions: 150,
        netPay: 1350,
        earningsBreakdown: [],
        deductionsBreakdown: [],
        leaveSummary: { annual: 0, sick: 0, unpaid: 0 },
        ytdGrossEarnings: 0,
        ytdTotalDeductions: 0,
      },
    ] as MockPayslip[];

    const getEmployeeName = (id: string) => (id === "e1" ? "Alice Adams" : "Bob Brown");
    const getEmployeeCustomId = (id: string) => (id === "e1" ? "EMP-001" : "EMP-002");

    const groups = groupPayslipsByEmployee(payslips, getEmployeeName, getEmployeeCustomId);

    expect(groups).toHaveLength(2);
    expect(groups[0].name).toBe("Alice Adams");
    expect(groups[0].payslips).toHaveLength(2);
    expect(groups[0].payslips[0].id).toBe("p1");
    expect(groups[0].totalNet).toBe(2700);
    expect(groups[1].name).toBe("Bob Brown");
  });
});
