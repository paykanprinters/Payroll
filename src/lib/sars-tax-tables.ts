/**
 * Official SARS individual tax tables for PAYE, rebates, and UIF/SDL.
 *
 * SARS does not expose a public API for these figures. Payroll systems (including
 * Sage, SimplePay, etc.) maintain curated tables from the Budget and the
 * Guide for Employers in respect of Employees' Tax, then apply them via backend jobs.
 *
 * Sources:
 * - https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/
 * - https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/
 */

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

/** Tax year 2026 — 1 March 2025 to 28 February 2026 (unchanged in Budget 2025). */
const TAX_YEAR_2026: SarsTaxYearTables = {
  startDate: "2025-03-01",
  endDate: "2026-02-28",
  periodLabel: "1 March 2025 – 28 February 2026",
  sourceUrl: "https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/",
  payeBrackets: [
    { min_income: 0, max_income: 237_100, rate: 0.18, deduction: 0 },
    { min_income: 237_101, max_income: 370_500, rate: 0.26, deduction: 42_678 },
    { min_income: 370_501, max_income: 512_800, rate: 0.31, deduction: 77_362 },
    { min_income: 512_801, max_income: 673_000, rate: 0.36, deduction: 121_475 },
    { min_income: 673_001, max_income: 857_900, rate: 0.39, deduction: 179_147 },
    { min_income: 857_901, max_income: 1_817_000, rate: 0.41, deduction: 251_258 },
    { min_income: 1_817_001, max_income: null, rate: 0.45, deduction: 644_489 },
  ],
  rebates: {
    under65: 17_235,
    sixtyFiveToSeventyFour: 9_444,
    seventyFivePlus: 3_145,
  },
  uifSdlRates: {
    uif_rate: 0.01,
    uif_cap: 177.12,
    sdl_rate: 0.01,
  },
  medicalTaxCredits: {
    mainMember: 364,
    firstDependant: 364,
    additionalDependant: 246,
  },
};

/** Tax year 2027 — 1 March 2026 to 28 February 2027 (Budget 2026, effective 1 March 2026). */
const TAX_YEAR_2027: SarsTaxYearTables = {
  startDate: "2026-03-01",
  endDate: "2027-02-28",
  periodLabel: "1 March 2026 – 28 February 2027",
  sourceUrl: "https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/",
  payeBrackets: [
    { min_income: 0, max_income: 245_100, rate: 0.18, deduction: 0 },
    { min_income: 245_101, max_income: 383_100, rate: 0.26, deduction: 44_118 },
    { min_income: 383_101, max_income: 530_200, rate: 0.31, deduction: 79_998 },
    { min_income: 530_201, max_income: 695_800, rate: 0.36, deduction: 125_599 },
    { min_income: 695_801, max_income: 887_000, rate: 0.39, deduction: 185_215 },
    { min_income: 887_001, max_income: 1_878_600, rate: 0.41, deduction: 259_783 },
    { min_income: 1_878_601, max_income: null, rate: 0.45, deduction: 666_339 },
  ],
  rebates: {
    under65: 17_820,
    sixtyFiveToSeventyFour: 9_765,
    seventyFivePlus: 3_249,
  },
  uifSdlRates: {
    uif_rate: 0.01,
    uif_cap: 177.12,
    sdl_rate: 0.01,
  },
  medicalTaxCredits: {
    mainMember: 376,
    firstDependant: 376,
    additionalDependant: 252,
  },
};

export const SARS_TAX_TABLES_BY_YEAR: Record<number, SarsTaxYearTables> = {
  2026: TAX_YEAR_2026,
  2027: TAX_YEAR_2027,
};

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
