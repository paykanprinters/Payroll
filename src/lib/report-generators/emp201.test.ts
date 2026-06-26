import { describe, expect, it } from "vitest";
import { computeEmp201Totals, generateEmp201ReportContent } from "@/lib/report-generators/emp201";
import type { MockPayslip } from "@/lib/mock-data-interfaces";

const makePayslip = (over: Partial<MockPayslip>): MockPayslip =>
  ({
    id: over.id ?? "p1",
    employeeId: over.employeeId ?? "e1",
    employeeName: "Test",
    payPeriod: over.payPeriod ?? "2026-03-01 - 2026-03-31",
    grossEarnings: 30_000,
    netPay: 0,
    earningsBreakdown: [],
    deductionsBreakdown: over.deductionsBreakdown ?? [],
    employerSdl: over.employerSdl,
    ...over,
  }) as MockPayslip;

describe("EMP201 monthly declaration (COMP-10)", () => {
  it("aggregates PAYE, SDL and UIF (2%) and computes the total payable", () => {
    const payslips: MockPayslip[] = [
      makePayslip({
        id: "p1",
        deductionsBreakdown: [
          { name: "PAYE", amount: 4_681 },
          { name: "UIF", amount: 177.12 },
        ],
        employerSdl: 300,
      }),
      makePayslip({
        id: "p2",
        deductionsBreakdown: [
          { name: "PAYE", amount: 1_215 },
          { name: "UIF", amount: 150 },
        ],
        employerSdl: 150,
      }),
    ];

    const t = computeEmp201Totals(payslips);

    expect(t.payslipCount).toBe(2);
    expect(t.paye).toBeCloseTo(5_896, 2);
    expect(t.uifEmployee).toBeCloseTo(327.12, 2);
    expect(t.uifEmployer).toBeCloseTo(327.12, 2); // employer matches 1%
    expect(t.uifTotal).toBeCloseTo(654.24, 2); // 2%
    expect(t.sdl).toBeCloseTo(450, 2);
    expect(t.eti).toBe(0);
    // 5,896 + 654.24 + 450 - 0
    expect(t.totalPayable).toBeCloseTo(7_000.24, 2);
  });

  it("falls back to legacy SDL in deductionsBreakdown when employerSdl is absent", () => {
    const payslips: MockPayslip[] = [
      makePayslip({
        deductionsBreakdown: [
          { name: "PAYE", amount: 1_000 },
          { name: "UIF", amount: 100 },
          { name: "SDL", amount: 200 }, // legacy pre-COMP-01 payslip
        ],
        employerSdl: undefined,
      }),
    ];
    const t = computeEmp201Totals(payslips);
    expect(t.sdl).toBeCloseTo(200, 2);
    expect(t.uifTotal).toBeCloseTo(200, 2);
    expect(t.totalPayable).toBeCloseTo(1_000 + 200 + 200, 2);
  });

  it("renders the EMP201 view filtered to the selected month with a due date", () => {
    const payslips: MockPayslip[] = [
      makePayslip({
        id: "march",
        payPeriod: "2026-03-01 - 2026-03-31",
        deductionsBreakdown: [{ name: "PAYE", amount: 4_681 }, { name: "UIF", amount: 177.12 }],
        employerSdl: 300,
      }),
      makePayslip({
        id: "april",
        payPeriod: "2026-04-01 - 2026-04-30",
        deductionsBreakdown: [{ name: "PAYE", amount: 9_999 }, { name: "UIF", amount: 177.12 }],
        employerSdl: 300,
      }),
    ];

    const html = generateEmp201ReportContent(payslips, [], new Date("2026-03-15"), "monthly");

    expect(html).toContain("March 2026");
    expect(html).toMatch(/PAYE[\s\S]*4[\s,.]681/); // en-ZA may use a space separator
    expect(html).toContain("7 April 2026"); // due by the 7th of the next month
    expect(html).not.toMatch(/9[\s,.]999/); // April payslip excluded
  });

  it("shows an empty-state message when there are no payslips for the month", () => {
    const html = generateEmp201ReportContent([], [], new Date("2026-03-15"), "monthly");
    expect(html).toContain("No payslip data available");
  });
});
