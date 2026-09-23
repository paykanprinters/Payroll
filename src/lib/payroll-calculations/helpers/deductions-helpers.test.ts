import { describe, it, expect } from "vitest";
import { buildDeductions } from "@/lib/payroll-calculations/helpers/deductions-helpers";
import type { TaxTables } from "@/hooks/use-tax-tables";
import type { MockEmployee } from "@/lib/mock-data-interfaces";
import type { UserTaxSettings } from "@/integrations/supabase/user-tax-settings-queries";

const taxTables: TaxTables = {
  payeBrackets: [
    { min_income: 1, max_income: 237100, rate: 0.18, deduction: 0 },
    { min_income: 237101, max_income: 370500, rate: 0.26, deduction: 42678 },
  ],
  uifSdlRates: { uif_rate: 0.01, uif_cap: 177.12, sdl_rate: 0.01 },
  taxYearDetails: {
    year: 2027,
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
const taxSettings = (applyPaye: boolean, applySdl: boolean): UserTaxSettings => ({
  userId: "test-user",
  applyPaye,
  applySdl,
  enableIrp5Export: false,
  irp5ContentFontSize: 12,
});

function find(breakdown: { name: string; amount: number }[], name: string) {
  return breakdown.find((d) => d.name === name)?.amount;
}

describe("buildDeductions — statutory", () => {
  it("does NOT deduct SDL from the employee; reports it as an employer cost (COMP-01)", () => {
    // SDL is an EMPLOYER levy (1% of leviable remuneration) and must never reduce
    // employee net pay. It must be absent from the employee deductions breakdown
    // and surfaced separately via employerSdl. With gross 30000 -> employerSdl 300.
    const { deductionsBreakdown, employerSdl } = buildDeductions(
      employee,
      30000,
      [],
      [],
      taxTables,
      taxSettings(false, true),
      periodStart,
      periodEnd,
      "2026-03",
      [],
    );
    expect(find(deductionsBreakdown, "SDL")).toBeUndefined();
    expect(employerSdl).toBe(300);
  });

  it("reports zero employer SDL when the employer is SDL-exempt (toggle off)", () => {
    const { deductionsBreakdown, employerSdl } = buildDeductions(
      employee,
      30000,
      [],
      [],
      taxTables,
      taxSettings(false, false),
      periodStart,
      periodEnd,
      "2026-03",
      [],
    );
    expect(find(deductionsBreakdown, "SDL")).toBeUndefined();
    expect(employerSdl).toBe(0);
  });

  it("caps UIF at the monthly ceiling for high earners", () => {
    const { deductionsBreakdown } = buildDeductions(
      employee,
      30000,
      [],
      [],
      taxTables,
      taxSettings(false, false),
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
      taxSettings(false, false),
      periodStart,
      periodEnd,
      "2026-03",
      [],
    );
    expect(find(deductionsBreakdown, "UIF")).toBe(100);
  });

  it("levies PAYE on remuneration (UIF is NOT deducted from the taxable base)", () => {
    // COMP-02: PAYE must be computed on gross remuneration, not gross - UIF.
    // gross 30000 -> annual 360000, second bracket (lower threshold 237100):
    //   42678 + 0.26 * (360000 - 237100) - 16425 = 58207 / 12 = 4850.58.
    // The old (buggy) gross-minus-UIF base produced ~4804.51.
    const { deductionsBreakdown, totalDeductions, employerSdl } = buildDeductions(
      employee,
      30000,
      [],
      [],
      taxTables,
      taxSettings(true, true),
      periodStart,
      periodEnd,
      "2026-03",
      [],
    );
    const uif = find(deductionsBreakdown, "UIF")!;
    const paye = find(deductionsBreakdown, "PAYE")!;
    expect(uif).toBe(177.12);
    expect(paye).toBeCloseTo(4850.58, 2);
    expect(find(deductionsBreakdown, "SDL")).toBeUndefined();
    expect(employerSdl).toBe(300);
    expect(totalDeductions).toBeCloseTo(uif + paye, 2);
  });

  it("skips PAYE/UIF/SDL when cash employee has trackTax off", () => {
    const cashNoTax = {
      ...employee,
      paymentMode: "Cash",
      trackTax: false,
    } as MockEmployee;
    const { deductionsBreakdown, employerSdl } = buildDeductions(
      cashNoTax,
      30000,
      [],
      [],
      taxTables,
      taxSettings(true, true),
      periodStart,
      periodEnd,
      "2026-03",
      [],
    );
    expect(find(deductionsBreakdown, "PAYE")).toBeUndefined();
    expect(find(deductionsBreakdown, "UIF")).toBeUndefined();
    expect(employerSdl).toBe(0);
  });
});
