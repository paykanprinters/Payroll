/** Keep in sync with src/lib/sars-tax-tables.ts */

export type PayeBracketRow = {
  min_income: number;
  max_income: number | null;
  rate: number;
  deduction: number;
};

export type SarsTaxYearTables = {
  startDate: string;
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
  medicalTaxCredits: {
    mainMember: number;
    firstDependant: number;
    additionalDependant: number;
  };
};

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
  rebates: { under65: 17_235, sixtyFiveToSeventyFour: 9_444, seventyFivePlus: 3_145 },
  uifSdlRates: { uif_rate: 0.01, uif_cap: 177.12, sdl_rate: 0.01 },
  medicalTaxCredits: { mainMember: 364, firstDependant: 364, additionalDependant: 246 },
};

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
  rebates: { under65: 17_820, sixtyFiveToSeventyFour: 9_765, seventyFivePlus: 3_249 },
  uifSdlRates: { uif_rate: 0.01, uif_cap: 177.12, sdl_rate: 0.01 },
  medicalTaxCredits: { mainMember: 376, firstDependant: 376, additionalDependant: 252 },
};

export const SARS_TAX_TABLES_BY_YEAR: Record<number, SarsTaxYearTables> = {
  2026: TAX_YEAR_2026,
  2027: TAX_YEAR_2027,
};

export function getSarsTaxTablesForYear(taxYear: number): SarsTaxYearTables | null {
  return SARS_TAX_TABLES_BY_YEAR[taxYear] ?? null;
}

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
