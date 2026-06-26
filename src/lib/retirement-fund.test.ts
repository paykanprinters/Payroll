import { describe, expect, it } from "vitest";
import {
  computeRetirementContribution,
  periodsPerYear,
  RETIREMENT_FUND_ANNUAL_CAP,
} from "@/lib/retirement-fund";

describe("Section 11F retirement-fund contribution (COMP-08)", () => {
  it("maps pay frequency to periods per year", () => {
    expect(periodsPerYear("Monthly")).toBe(12);
    expect(periodsPerYear("Weekly")).toBe(52);
    expect(periodsPerYear("Bi-Weekly")).toBe(26);
    expect(periodsPerYear(undefined)).toBe(12);
  });

  it("returns zero when there is no contribution", () => {
    expect(
      computeRetirementContribution(30_000, {}, "Monthly")
    ).toEqual({ total: 0, taxDeductible: 0, cappedByRate: false, cappedByAnnual: false });
  });

  it("treats a within-cap percentage contribution as fully deductible (golden E08)", () => {
    const r = computeRetirementContribution(
      30_000,
      { retirementFundContributionPercent: 7.5 },
      "Monthly"
    );
    expect(r.total).toBeCloseTo(2_250, 2);
    expect(r.taxDeductible).toBeCloseTo(2_250, 2);
    expect(r.cappedByRate).toBe(false);
    expect(r.cappedByAnnual).toBe(false);
  });

  it("sums percentage and fixed contributions", () => {
    const r = computeRetirementContribution(
      20_000,
      { retirementFundContributionPercent: 5, retirementFundContributionFixed: 500 },
      "Monthly"
    );
    // 5% of 20,000 = 1,000 + 500 = 1,500
    expect(r.total).toBeCloseTo(1_500, 2);
    expect(r.taxDeductible).toBeCloseTo(1_500, 2);
  });

  it("caps the deductible portion at 27.5% of remuneration", () => {
    // 40% requested, but only 27.5% is deductible; full amount still withheld.
    const r = computeRetirementContribution(
      20_000,
      { retirementFundContributionPercent: 40 },
      "Monthly"
    );
    expect(r.total).toBeCloseTo(8_000, 2); // 40% of 20,000
    expect(r.taxDeductible).toBeCloseTo(5_500, 2); // 27.5% of 20,000
    expect(r.cappedByRate).toBe(true);
    expect(r.cappedByAnnual).toBe(false);
  });

  it("caps the deductible portion at the pro-rated R350,000 annual ceiling", () => {
    // Very high earner: 27.5% of 200,000 = 55,000 but monthly annual cap is 29,166.67.
    const r = computeRetirementContribution(
      200_000,
      { retirementFundContributionPercent: 27.5 },
      "Monthly"
    );
    expect(r.total).toBeCloseTo(55_000, 2);
    expect(r.taxDeductible).toBeCloseTo(RETIREMENT_FUND_ANNUAL_CAP / 12, 2); // 29,166.67
    expect(r.cappedByAnnual).toBe(true);
    expect(r.cappedByRate).toBe(false);
  });

  it("pro-rates the fixed portion and annual cap for partial periods", () => {
    const r = computeRetirementContribution(
      15_000,
      { retirementFundContributionFixed: 1_000 },
      "Monthly",
      0.5
    );
    // Fixed 1,000 * 0.5 = 500; well within caps.
    expect(r.total).toBeCloseTo(500, 2);
    expect(r.taxDeductible).toBeCloseTo(500, 2);
  });
});
