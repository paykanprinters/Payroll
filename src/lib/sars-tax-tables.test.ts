import { describe, expect, it } from "vitest";
import { calculatePAYE } from "@/lib/payroll-calculations";
import { buildSarsTaxYearDetails, getSarsTaxTablesForYear } from "@/lib/sars-tax-tables";

describe("SARS tax tables", () => {
  it("includes 2027 brackets from the Budget 2026 announcement", () => {
    const tables = getSarsTaxTablesForYear(2027);
    expect(tables).not.toBeNull();
    expect(tables!.payeBrackets[0].max_income).toBe(245_100);
    expect(tables!.rebates.under65).toBe(17_820);
  });

  it("aligns tax-year dates with the SA fiscal year (COMP-04)", () => {
    const ty2026 = getSarsTaxTablesForYear(2026)!;
    const ty2027 = getSarsTaxTablesForYear(2027)!;

    expect(ty2026.startDate).toBe("2025-03-01");
    expect(ty2026.endDate).toBe("2026-02-28");
    expect(ty2026.periodLabel).toContain("March 2025");
    expect(ty2026.periodLabel).toContain("February 2026");

    expect(ty2027.startDate).toBe("2026-03-01");
    expect(ty2027.endDate).toBe("2027-02-28");
    expect(ty2027.periodLabel).toContain("March 2026");
    expect(ty2027.periodLabel).toContain("February 2027");
  });

  it("buildSarsTaxYearDetails uses curated dates (not year±1 arithmetic)", () => {
    const details2027 = buildSarsTaxYearDetails(2027)!;
    expect(details2027.year).toBe(2027);
    expect(details2027.start_date).toBe("2026-03-01");
    expect(details2027.end_date).toBe("2027-02-28");
    expect(details2027.description).toContain("1 March 2026");
  });

  it("calculates monthly PAYE using 2027 primary rebate", () => {
    const tables = getSarsTaxTablesForYear(2027)!;
    const taxYearDetails = buildSarsTaxYearDetails(2027)!;
    const annualTaxable = 400_000;
    const monthlyTaxable = annualTaxable / 12;

    const monthlyPaye = calculatePAYE(
      monthlyTaxable,
      tables.payeBrackets,
      taxYearDetails,
      30,
      "Monthly"
    );
    const bracketIndex = tables.payeBrackets.findIndex(
      (row) => annualTaxable >= row.min_income && (row.max_income === null || annualTaxable <= row.max_income)
    );
    const bracket = tables.payeBrackets[bracketIndex];
    // SARS marginal formula uses the bracket's lower threshold (previous bracket's
    // upper bound), not min_income.
    const lowerThreshold = bracketIndex > 0 ? (tables.payeBrackets[bracketIndex - 1].max_income ?? 0) : 0;
    const annualPaye = (annualTaxable - lowerThreshold) * bracket.rate + bracket.deduction - tables.rebates.under65;
    expect(monthlyPaye).toBeCloseTo(annualPaye / 12, 2);
  });
});
