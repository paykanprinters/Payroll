import { describe, expect, it } from "vitest";
import {
  buildEmployeeDeductionsReport,
  employeeDeductionsCsv,
  generateEmployeeDeductionsReportContent,
} from "@/lib/report-generators/employee-deductions";
import type { MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";

const employees = [
  { id: "e1", firstName: "Zanele", lastName: "Mokoena", idNumber: "0101015800087" },
  { id: "e2", firstName: "Andre", lastName: "Botha" },
] as MockEmployee[];

const slip = (
  employeeId: string,
  payPeriod: string,
  extra: Partial<MockPayslip> = {},
  deductions: { name: string; amount: number }[] = [
    { name: "PAYE", amount: 100 },
    { name: "UIF", amount: 20 },
    { name: "Loan Repayment", amount: 50 },
    { name: "Savings", amount: 30 },
  ]
): MockPayslip =>
  ({
    id: `${employeeId}-${payPeriod}`,
    employeeId,
    payPeriod,
    payDate: "01/01/2026",
    grossEarnings: 2000,
    totalDeductions: deductions.reduce((s, d) => s + d.amount, 0),
    netPay: 2000 - deductions.reduce((s, d) => s + d.amount, 0),
    earningsBreakdown: [],
    deductionsBreakdown: deductions,
    leaveSummary: { annual: 0, sick: 0, unpaid: 0 },
    ytdGrossEarnings: 0,
    ytdTotalDeductions: 0,
    ...extra,
  }) as MockPayslip;

describe("buildEmployeeDeductionsReport", () => {
  const payslips = [
    slip("e1", "2026-10-07 - 2026-10-13", { loanDeduction: 50, loanBalance: 450, savingsBalance: 300 }),
    slip("e1", "2026-10-14 - 2026-10-20", { loanDeduction: 50, loanBalance: 400, savingsBalance: 330 }),
    slip("e2", "2026-10-14 - 2026-10-20", {}, [
      { name: "PAYE", amount: 80 },
      { name: "UIF", amount: 20 },
      { name: "Medical aid", amount: 15 },
    ]),
    slip("e1", "2026-11-04 - 2026-11-10"),
  ];

  it("totals each employee's deductions for the month and takes balances from the last payslip", () => {
    const report = buildEmployeeDeductionsReport(payslips, employees, new Date(2026, 9, 15), "monthly");
    expect(report.periodDescription).toBe("October 2026");
    expect(report.rows.map((r) => r.name)).toEqual(["Andre Botha", "Zanele Mokoena"]);

    const zanele = report.rows[1];
    expect(zanele.payslipCount).toBe(2);
    expect(zanele.paye).toBe(200);
    expect(zanele.uif).toBe(40);
    expect(zanele.loan).toBe(100);
    expect(zanele.savings).toBe(60);
    expect(zanele.otherDeductions).toBe(0);
    expect(zanele.loanBalance).toBe(400);
    expect(zanele.savingsBalance).toBe(330);

    const andre = report.rows[0];
    expect(andre.otherDeductions).toBe(15);
    expect(andre.loanBalance).toBeNull();

    expect(report.totals.paye).toBe(280);
    expect(report.totals.totalDeductions).toBe(400 + 115);
    expect(report.totals.loanBalance).toBe(400);
  });

  it("reports a single pay week in the weekly view", () => {
    const report = buildEmployeeDeductionsReport(payslips, employees, new Date(2026, 9, 14), "weekly");
    expect(report.periodDescription).toBe("the pay week 14 Oct – 20 Oct 2026");
    expect(report.rows).toHaveLength(2);
    expect(report.rows.find((r) => r.employeeId === "e1")?.payslipCount).toBe(1);
    expect(report.totals.paye).toBe(180);
  });

  it("uses the SARS tax year for the yearly view", () => {
    const report = buildEmployeeDeductionsReport(
      [slip("e2", "2026-02-25 - 2026-03-03"), slip("e2", "2026-03-04 - 2026-03-10")],
      employees,
      new Date(2027, 0, 1),
      "yearly"
    );
    expect(report.periodDescription).toContain("Tax year 2027");
    expect(report.rows[0].payslipCount).toBe(1);
  });
});

describe("employee deductions output", () => {
  const payslips = [slip("e1", "2026-10-07 - 2026-10-13", { loanBalance: 450, savingsBalance: 300 })];

  it("renders a table with a total row", () => {
    const html = generateEmployeeDeductionsReportContent(payslips, employees, new Date(2026, 9, 1), "monthly");
    expect(html).toContain("Zanele Mokoena");
    expect(html).toContain("Loan balance");
    expect(html).toContain("Total");
  });

  it("keeps ID numbers as text in the CSV and adds a total line", () => {
    const csv = employeeDeductionsCsv(payslips, employees, new Date(2026, 9, 1), "monthly")!;
    const lines = csv.replace("\uFEFF", "").split("\r\n");
    expect(lines[0]).toContain("PAYE");
    expect(lines[1]).toContain('"=""0101015800087"""');
    expect(lines[1]).toContain("100.00");
    expect(lines[2].startsWith("Total")).toBe(true);
  });

  it("leaves cash-paid employees out of the rows but adds their PAYE and UIF to the totals", () => {
    const withCash = [
      ...employees,
      { id: "e3", firstName: "Cash", lastName: "Worker", paymentMode: "Cash" },
      { id: "e4", firstName: "Untaxed", lastName: "Cash", paymentMode: "Cash", trackTax: false },
    ] as MockEmployee[];
    const slips = [...payslips, slip("e3", "2026-10-07 - 2026-10-13"), slip("e4", "2026-10-07 - 2026-10-13")];
    const report = buildEmployeeDeductionsReport(slips, withCash, new Date(2026, 9, 1), "monthly");
    expect(report.rows.map((r) => r.employeeId)).toEqual(["e1"]);
    expect(report.cash).toEqual({ employeeCount: 1, paye: 100, uif: 20 });
    expect(report.totals.paye).toBe(200);
    expect(report.totals.uif).toBe(40);
    expect(report.totals.gross).toBe(2000);
    expect(report.totals.loan).toBe(50);

    const html = generateEmployeeDeductionsReportContent(slips, withCash, new Date(2026, 9, 1), "monthly");
    expect(html).not.toContain("Cash Worker");
    expect(html).toMatch(/200[.,]00\*/);
    expect(html).toContain("* Cash payment employees have not been captured");

    const csv = employeeDeductionsCsv(slips, withCash, new Date(2026, 9, 1), "monthly")!;
    expect(csv).not.toContain("Cash Worker");
    expect(csv).toContain("200.00*");
    expect(csv).toContain("Cash payment employees have not been captured");
  });

  it("returns nothing when the period has no payslips", () => {
    expect(employeeDeductionsCsv(payslips, employees, new Date(2025, 0, 1), "monthly")).toBeNull();
  });
});
