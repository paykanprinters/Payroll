import { describe, expect, it } from "vitest";
import { calculatePAYE } from "@/lib/payroll-calculations";
import { getSarsTaxTablesForYear } from "@/lib/sars-tax-tables";

describe("SARS tax tables", () => {
  it("includes 2027 brackets from the Budget 2026 announcement", () => {
    const tables = getSarsTaxTablesForYear(2027);
    expect(tables).not.toBeNull();
    expect(tables!.payeBrackets[0].max_income).toBe(245_100);
    expect(tables!.rebates.under65).toBe(17_820);
  });

  it("calculates monthly PAYE using 2027 primary rebate", () => {
    const tables = getSarsTaxTablesForYear(2027)!;
    const annualTaxable = 400_000;
    const monthlyTaxable = annualTaxable / 12;

    const monthlyPaye = calculatePAYE(
      monthlyTaxable,
      tables.payeBrackets,
      {
        year: 2027,
        start_date: "2027-03-01",
        end_date: "2028-02-28",
        description: tables.periodLabel,
        rebates: tables.rebates,
      },
      30,
      "Monthly"
    );

    const bracket = tables.payeBrackets.find(
      (row) => annualTaxable >= row.min_income && (row.max_income === null || annualTaxable <= row.max_income)
    )!;
    const annualPaye = (annualTaxable - bracket.min_income) * bracket.rate + bracket.deduction - tables.rebates.under65;
    expect(monthlyPaye).toBeCloseTo(annualPaye / 12, 2);
  });
});
