import { describe, expect, it } from "vitest";
import { generateTaxStatutoryReportContent } from "@/lib/report-generators/tax-statutory";
import type { MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";

const slip = (payPeriod: string): MockPayslip =>
  ({
    id: payPeriod,
    employeeId: "e1",
    payPeriod,
    payDate: "01/03/2026",
    grossEarnings: 1000,
    totalDeductions: 200,
    netPay: 800,
    earningsBreakdown: [],
    deductionsBreakdown: [
      { name: "PAYE", amount: 100 },
      { name: "UIF", amount: 100 },
    ],
    leaveSummary: { annual: 0, sick: 0, unpaid: 0 },
    ytdGrossEarnings: 0,
    ytdTotalDeductions: 0,
  }) as MockPayslip;

describe("generateTaxStatutoryReportContent — yearly", () => {
  it("uses the SA fiscal year (Mar–Feb), not calendar year", () => {
    const payslips = [
      slip("2026-03-01 - 2026-03-31"),
      slip("2027-02-01 - 2027-02-28"),
      slip("2027-03-01 - 2027-03-31"),
    ];
    const html = generateTaxStatutoryReportContent(
      payslips,
      [] as MockEmployee[],
      new Date(2027, 0, 1),
      "yearly"
    );

    expect(html).toContain("Tax year 2027");
    expect(html).toContain("March 2026");
    expect(html).toContain("February 2027");
    // Mar 2026 + Feb 2027 PAYE only (Mar 2027 excluded) → total 200
    expect(html).toMatch(/PAYE[\s\S]*200[,.]00/);
    expect(html).not.toMatch(/PAYE[\s\S]*300[,.]00/);
  });
});
