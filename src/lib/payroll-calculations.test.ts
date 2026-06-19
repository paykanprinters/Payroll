import { describe, it, expect } from "vitest";
import { calculatePAYE } from "@/lib/payroll-calculations";
import { bankersRound } from "@/lib/utils";
import type { TaxTables } from "@/hooks/use-tax-tables";

const payeBrackets: TaxTables["payeBrackets"] = [
  { min_income: 1, max_income: 237100, rate: 0.18, deduction: 0 },
  { min_income: 237101, max_income: 370500, rate: 0.26, deduction: 42678 },
  { min_income: 370501, max_income: 512800, rate: 0.31, deduction: 77362 },
  { min_income: 512801, max_income: 673000, rate: 0.36, deduction: 121475 },
  { min_income: 673001, max_income: 857900, rate: 0.39, deduction: 179147 },
  { min_income: 857901, max_income: 1817000, rate: 0.41, deduction: 251258 },
  { min_income: 1817001, max_income: null, rate: 0.45, deduction: 644489 },
];

const taxYearDetails: TaxTables["taxYearDetails"] = {
  year: 2026,
  start_date: "2026-03-01",
  end_date: "2027-02-28",
  description: "Test tax year",
  rebates: {
    under65: 16425,
    sixtyFiveToSeventyFour: 9033,
    seventyFivePlus: 2994,
  },
};

describe("bankersRound", () => {
  it("rounds half to even", () => {
    expect(bankersRound(2.5, 0)).toBe(2);
    expect(bankersRound(3.5, 0)).toBe(4);
    expect(bankersRound(0.125, 2)).toBe(0.12);
    expect(bankersRound(0.135, 2)).toBe(0.14);
  });

  it("rounds normal cases to 2 decimals", () => {
    expect(bankersRound(4850.5616667, 2)).toBe(4850.56);
    expect(bankersRound(300.0, 2)).toBe(300);
  });
});

describe("calculatePAYE", () => {
  it("computes monthly PAYE in the second bracket with the under-65 rebate", () => {
    // Monthly taxable 30000 -> annual 360000, bracket 237101-370500.
    // (360000 - 237101) * 0.26 + 42678 - 16425 = 58206.74 annual -> /12
    const paye = calculatePAYE(30000, payeBrackets, taxYearDetails, 40, "Monthly");
    expect(paye).toBeCloseTo(4850.56, 2);
  });

  it("returns 0 when income is fully covered by the rebate", () => {
    // Low income whose tax is below the primary rebate.
    const paye = calculatePAYE(5000, payeBrackets, taxYearDetails, 40, "Monthly");
    expect(paye).toBe(0);
  });

  it("annualizes weekly income consistently with monthly", () => {
    // 6923.0769/week ~ 30000/month annualized; both annualize to ~360000.
    const weekly = calculatePAYE(360000 / 52, payeBrackets, taxYearDetails, 40, "Weekly");
    const monthly = calculatePAYE(360000 / 12, payeBrackets, taxYearDetails, 40, "Monthly");
    // Weekly period PAYE * 52 should equal monthly period PAYE * 12 (same annual tax).
    expect(weekly * 52).toBeCloseTo(monthly * 12, 0);
  });

  it("gives a larger rebate (less tax) to a 65+ employee", () => {
    const under65 = calculatePAYE(30000, payeBrackets, taxYearDetails, 40, "Monthly");
    const over65 = calculatePAYE(30000, payeBrackets, taxYearDetails, 70, "Monthly");
    expect(over65).toBeLessThan(under65);
  });

  it("returns 0 when there are no brackets", () => {
    expect(calculatePAYE(30000, [], taxYearDetails, 40, "Monthly")).toBe(0);
  });
});
