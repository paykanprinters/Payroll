/**
 * Annual Budget freshness gate (COMP-17).
 *
 * This suite is the CI guard that forces the curated SARS tax tables in
 * `shared/sars-tax-tables.json` to be updated every year after the Budget. It does two
 * things:
 *
 *  1. Asserts that curated tables exist for the tax year the app would be
 *     calculating *today*. Once the live date rolls past the latest curated
 *     fiscal window (i.e. after 1 March of an un-updated year), this test fails
 *     and blocks CI until someone adds the new tax year.
 *  2. Validates the structural integrity of every curated year so a bad manual
 *     edit (overlapping brackets, missing rebates, etc.) is caught before merge.
 *
 * See docs/ANNUAL_TAX_TABLE_UPDATE.md for the update runbook.
 */
import { describe, expect, it } from "vitest";
import {
  SARS_TAX_TABLES_BY_YEAR,
  SUPPORTED_SARS_TAX_YEARS,
  getSarsTaxTablesForYear,
  type SarsTaxYearTables,
} from "@/lib/sars-tax-tables";
import { computeSarsTaxYearBounds, getSarsTaxYearForDate } from "@/lib/tax-year-period";

const curatedYears = SUPPORTED_SARS_TAX_YEARS;

describe("SARS tax-table coverage (annual Budget gate)", () => {
  it("has curated tables for the live tax year (update after each Budget)", () => {
    const liveTaxYear = getSarsTaxYearForDate(new Date());
    const tables = getSarsTaxTablesForYear(liveTaxYear);

    expect(
      tables,
      [
        `No curated SARS tax tables for the current tax year ${liveTaxYear}.`,
        "The SA Budget tables must be added after the annual Budget speech.",
        "See docs/ANNUAL_TAX_TABLE_UPDATE.md, then add the year to",
        "shared/sars-tax-tables.json and run pnpm sync:sars-tax-tables.",
      ].join(" ")
    ).not.toBeNull();
  });

  it("exposes supported years sorted newest-first and matching the map", () => {
    expect(curatedYears.length).toBeGreaterThan(0);
    const mapYears = Object.keys(SARS_TAX_TABLES_BY_YEAR)
      .map(Number)
      .sort((a, b) => b - a);
    expect(curatedYears).toEqual(mapYears);
  });
});

describe.each(curatedYears)("curated tax year %s structural integrity", (year) => {
  const tables = getSarsTaxTablesForYear(year) as SarsTaxYearTables;

  it("aligns curated dates with the leap-safe SA fiscal window", () => {
    const bounds = computeSarsTaxYearBounds(year);
    expect(tables.startDate).toBe(bounds.start);
    expect(tables.endDate).toBe(bounds.end);
  });

  it("has contiguous, ascending PAYE brackets with an open-ended top bracket", () => {
    const brackets = tables.payeBrackets;
    expect(brackets.length).toBeGreaterThanOrEqual(3);
    expect(brackets[0].min_income).toBe(0);
    expect(brackets[0].deduction).toBe(0);

    for (let i = 0; i < brackets.length; i++) {
      const row = brackets[i];
      expect(row.rate).toBeGreaterThan(0);
      expect(row.rate).toBeLessThan(1);
      expect(row.deduction).toBeGreaterThanOrEqual(0);

      if (i < brackets.length - 1) {
        expect(row.max_income).not.toBeNull();
        // Next bracket starts exactly R1 above this bracket's ceiling.
        expect(brackets[i + 1].min_income).toBe((row.max_income as number) + 1);
        // Rates and base deductions must increase up the scale.
        expect(brackets[i + 1].rate).toBeGreaterThan(row.rate);
        expect(brackets[i + 1].deduction).toBeGreaterThan(row.deduction);
      } else {
        expect(row.max_income).toBeNull();
      }
    }
  });

  it("has age rebates ordered primary > secondary > tertiary", () => {
    const { under65, sixtyFiveToSeventyFour, seventyFivePlus } = tables.rebates;
    expect(under65).toBeGreaterThan(0);
    expect(sixtyFiveToSeventyFour).toBeGreaterThan(0);
    expect(seventyFivePlus).toBeGreaterThan(0);
    // Secondary/tertiary rebates are increments on top of the primary rebate,
    // so each individual figure is smaller than the primary.
    expect(under65).toBeGreaterThan(sixtyFiveToSeventyFour);
    expect(sixtyFiveToSeventyFour).toBeGreaterThan(seventyFivePlus);
  });

  it("has sane UIF/SDL rates and a positive monthly UIF cap", () => {
    const { uif_rate, uif_cap, sdl_rate } = tables.uifSdlRates;
    expect(uif_rate).toBeGreaterThan(0);
    expect(uif_rate).toBeLessThan(1);
    expect(sdl_rate).toBeGreaterThan(0);
    expect(sdl_rate).toBeLessThan(1);
    expect(uif_cap).toBeGreaterThan(0);
  });

  it("has Section 6A medical scheme fees tax credits", () => {
    const { mainMember, firstDependant, additionalDependant } = tables.medicalTaxCredits;
    expect(mainMember).toBeGreaterThan(0);
    expect(firstDependant).toBeGreaterThan(0);
    expect(additionalDependant).toBeGreaterThan(0);
  });

  it("documents a source URL for audit", () => {
    expect(tables.sourceUrl).toMatch(/^https:\/\/www\.sars\.gov\.za/);
  });
});
