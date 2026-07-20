/**
 * Official SARS individual tax tables for PAYE, rebates, and UIF/SDL.
 *
 * SARS does not expose a public API for these figures. Payroll systems (including
 * Sage, SimplePay, etc.) maintain curated tables from the Budget and the
 * Guide for Employers in respect of Employees' Tax, then apply them via backend jobs.
 *
 * Source of truth (numeric data): shared/sars-tax-tables.json
 * Deno edge copy: pnpm sync:sars-tax-tables → supabase/functions/_shared/sars-tax-tables.ts
 *
 * Sources:
 * - https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/
 * - https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/
 */

import curatedByYear from "../../shared/sars-tax-tables.json";

export type PayeBracketRow = {
  min_income: number;
  max_income: number | null;
  rate: number;
  /** Fixed amount at the bottom of the bracket (SARS "Rates of tax" base). */
  deduction: number;
};

export type SarsTaxYearTables = {
  /** SA fiscal window start (YYYY-MM-DD), e.g. 2026-03-01 for tax year 2027. */
  startDate: string;
  /** SA fiscal window end (YYYY-MM-DD). Leap-year 29 Feb is handled in COMP-06. */
  endDate: string;
  periodLabel: string;
  sourceUrl: string;
  payeBrackets: PayeBracketRow[];
  rebates: {
    under65: number;
    sixtyFiveToSeventyFour: number;
    seventyFivePlus: number;
  };
  uifSdlRates: {
    uif_rate: number;
    uif_cap: number;
    sdl_rate: number;
  };
  /**
   * Section 6A medical scheme fees tax credit (monthly, in Rands). Subtracted
   * from PAYE after rebates. `mainMember` covers the principal member, the same
   * amount typically applies to the first dependant, and `additionalDependant`
   * applies to each further dependant.
   */
  medicalTaxCredits: {
    mainMember: number;
    firstDependant: number;
    additionalDependant: number;
  };
};

function loadTablesByYear(
  raw: Record<string, SarsTaxYearTables>
): Record<number, SarsTaxYearTables> {
  const out: Record<number, SarsTaxYearTables> = {};
  for (const [key, value] of Object.entries(raw)) {
    out[Number(key)] = value;
  }
  return out;
}

export const SARS_TAX_TABLES_BY_YEAR: Record<number, SarsTaxYearTables> = loadTablesByYear(
  curatedByYear as Record<string, SarsTaxYearTables>
);

export const SUPPORTED_SARS_TAX_YEARS = Object.keys(SARS_TAX_TABLES_BY_YEAR)
  .map(Number)
  .sort((a, b) => b - a);

export function getSarsTaxTablesForYear(taxYear: number): SarsTaxYearTables | null {
  return SARS_TAX_TABLES_BY_YEAR[taxYear] ?? null;
}

export type MedicalTaxCredits = SarsTaxYearTables["medicalTaxCredits"];

/** Section 6A monthly medical scheme fees tax credits for a tax year. */
export function getSarsMedicalTaxCredits(taxYear: number): MedicalTaxCredits | null {
  return getSarsTaxTablesForYear(taxYear)?.medicalTaxCredits ?? null;
}

/**
 * Monthly Section 6A medical scheme fees tax credit.
 * @param isMember whether the employee is the principal medical-scheme member.
 * @param dependants number of dependants (excluding the main member).
 * @param credits the tax-year credit amounts.
 */
export function computeMonthlyMedicalTaxCredit(
  isMember: boolean,
  dependants: number,
  credits: MedicalTaxCredits | null
): number {
  if (!isMember || !credits) return 0;
  const safeDependants = Math.max(0, Math.floor(dependants || 0));
  const firstDependant = safeDependants >= 1 ? credits.firstDependant : 0;
  const additional = Math.max(0, safeDependants - 1) * credits.additionalDependant;
  return credits.mainMember + firstDependant + additional;
}

/** Tax-year metadata for DB persistence and payroll (single source of truth). */
export function buildSarsTaxYearDetails(taxYear: number) {
  const tables = getSarsTaxTablesForYear(taxYear);
  if (!tables) return null;
  return {
    year: taxYear,
    start_date: tables.startDate,
    end_date: tables.endDate,
    description: `SARS tax year (${tables.periodLabel})`,
    rebates: {
      under65: tables.rebates.under65,
      sixtyFiveToSeventyFour: tables.rebates.sixtyFiveToSeventyFour,
      seventyFivePlus: tables.rebates.seventyFivePlus,
    },
  };
}
