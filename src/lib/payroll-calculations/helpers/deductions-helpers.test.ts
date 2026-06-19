import { describe, it, expect } from "vitest";
import { buildDeductions } from "@/lib/payroll-calculations/helpers/deductions-helpers";
import type { TaxTables } from "@/hooks/use-tax-tables";
import type { MockEmployee } from "@/lib/mock-data-interfaces";

const taxTables: TaxTables = {
  payeBrackets: [
    { min_income: 1, max_income: 237100, rate: 0.18, deduction: 0 },
    { min_income: 237101, max_income: 370500, rate: 0.26, deduction: 42678 },
  ],
  uifSdlRates: { uif_rate: 0.01, uif_cap: 177.12, sdl_rate: 0.01 },
  taxYearDetails: {
    year: 2026,
    start_date: "2026-03-01",
    end_date: "2027-02-28",
    description: "Test",
    rebates: { under65: 16425, sixtyFiveToSeventyFour: 9033, seventyFivePlus: 2994 },
  },
};

const employee = {
  id: "E1",
  customEmployeeId: "EMP001",
  firstName: "Test",
  lastName: "User",
  email: "test@example.com",
  jobTitle: "Tester",
  salary: 30000,
  startDate: "2020-01-01",
  dateOfBirth: "1985-01-01",
  payFrequency: "Monthly",
} as unknown as MockEmployee;

const periodStart = new Date("2026-03-01T00:00:00Z");
const periodEnd = new Date("2026-03-31T00:00:00Z");

function find(breakdown: { name: string; amount: number }[], name: string) {
  return breakdown.find((d) => d.name === name)?.amount;
}

describe("buildDeductions — statutory", () => {
  it("levies SDL on gross remuneration, not on PAYE-taxable income + UIF", () => {
    // Regression guard for the SDL base bug. With gross 30000 and sdl_rate 0.01,
    // SDL must be exactly 300.00. The previous buggy formula produced ~475.35.
    const { deductionsBreakdown } = buildDeductions(
      employee,
      30000,
      [],
      [],
      taxTables,
      { applyPaye: false, applySdl: true } as any,
      periodStart,
      periodEnd,
      "2026-03",
      [],
    );
    expect(find(deductionsBreakdown, "SDL")).toBe(300);
  });

  it("caps UIF at the monthly ceiling for high earners", () => {
    const { deductionsBreakdown } = buildDeductions(
      employee,
      30000,
      [],
      [],
      taxTables,
      { applyPaye: false, applySdl: false } as any,
      periodStart,
      periodEnd,
      "2026-03",
      [],
    );
    expect(find(deductionsBreakdown, "UIF")).toBe(177.12);
  });

  it("charges 1% UIF below the cap", () => {
    const { deductionsBreakdown } = buildDeductions(
      employee,
      10000,
      [],
      [],
      taxTables,
      { applyPaye: false, applySdl: false } as any,
      periodStart,
      periodEnd,
      "2026-03",
      [],
    );
    expect(find(deductionsBreakdown, "UIF")).toBe(100);
  });

  it("excludes UIF from the PAYE taxable base", () => {
    // With PAYE enabled, taxable base is gross - UIF. UIF is still 177.12 capped.
    const { deductionsBreakdown, totalDeductions } = buildDeductions(
      employee,
      30000,
      [],
      [],
      taxTables,
      { applyPaye: true, applySdl: true } as any,
      periodStart,
      periodEnd,
      "2026-03",
      [],
    );
    expect(find(deductionsBreakdown, "UIF")).toBe(177.12);
    expect(find(deductionsBreakdown, "SDL")).toBe(300);
    expect(find(deductionsBreakdown, "PAYE")).toBeGreaterThan(0);
    expect(totalDeductions).toBeGreaterThan(177.12 + 300);
  });
});
