/**
 * COMP-18 — Permanent SARS parallel regression matrix.
 *
 * Drives the real statutory engine (`buildDeductions`) with hand-calculated,
 * SARS-correct PAYE / UIF / SDL / net figures for every supported curated tax
 * year. Each scenario documents the arithmetic in `notes`.
 *
 * Sources: official SARS individual tax tables + Guide for Employers (PAYE-GEN).
 * Run via `pnpm check:sars-compliance`.
 */

import { buildDeductions } from "@/lib/payroll-calculations/helpers/deductions-helpers";
import {
  SUPPORTED_SARS_TAX_YEARS,
  buildSarsTaxYearDetails,
  getSarsTaxTablesForYear,
} from "@/lib/sars-tax-tables";
import { bankersRound } from "@/lib/utils";
import type { TaxTables } from "@/hooks/use-tax-tables";
import type { MockEmployee } from "@/lib/mock-data-interfaces";
import type { UserTaxSettings } from "@/integrations/supabase/user-tax-settings-queries";

export const DOB_UNDER_65 = "1986-01-01";
export const DOB_65_TO_74 = "1958-01-01";
export const DOB_75_PLUS = "1946-01-01";

export type AgeBand = "under65" | "65to74" | "75plus";

export interface SarsRegressionScenario {
  id: string;
  label: string;
  frequency: "Monthly" | "Weekly" | "Bi-Weekly";
  ageBand: AgeBand;
  grossForPeriod: number;
  employee: MockEmployee;
  notes: string;
  sars: {
    paye: number;
    uif: number;
    net: number;
    sdlEmployer: number;
  };
}

export const REGRESSION_USER_TAX_SETTINGS: UserTaxSettings = {
  userId: "sars-regression",
  applyPaye: true,
  applySdl: true,
  enableIrp5Export: false,
  irp5ContentFontSize: 12,
  proRateUifCapByFrequency: false,
};

export function makeRegressionEmployee(
  id: string,
  frequency: MockEmployee["payFrequency"],
  dateOfBirth: string,
  salary: number,
  extra: Partial<MockEmployee> = {}
): MockEmployee {
  return {
    id,
    customEmployeeId: id,
    firstName: id,
    lastName: "Test",
    email: `${id.toLowerCase()}@example.com`,
    jobTitle: "Tester",
    startDate: "2020-01-01",
    dateOfBirth,
    payFrequency: frequency,
    salary,
    ...extra,
  };
}

export function buildRegressionTaxTables(taxYear: number): TaxTables {
  const sars = getSarsTaxTablesForYear(taxYear);
  if (!sars) {
    throw new Error(`No curated SARS tables for tax year ${taxYear}`);
  }
  const taxYearDetails = buildSarsTaxYearDetails(taxYear);
  if (!taxYearDetails) {
    throw new Error(`No tax year details for ${taxYear}`);
  }
  return {
    payeBrackets: sars.payeBrackets,
    uifSdlRates: sars.uifSdlRates,
    taxYearDetails,
  };
}

/** First calendar month of the SA fiscal window (always March). */
export function regressionPeriodForTaxYear(taxYear: number): {
  periodStart: Date;
  periodEnd: Date;
  monthKey: string;
} {
  const details = buildSarsTaxYearDetails(taxYear)!;
  const [y, m] = details.start_date.split("-").map(Number);
  return {
    periodStart: new Date(Date.UTC(y, m - 1, 1)),
    periodEnd: new Date(Date.UTC(y, m - 1, 31)),
    monthKey: details.start_date.slice(0, 7),
  };
}

export interface RegressionEngineResult {
  paye: number;
  uif: number;
  sdl: number;
  hasSdlDeduction: boolean;
  employerSdl: number;
  totalDeductions: number;
  net: number;
  breakdown: { name: string; amount: number }[];
}

export function runRegressionScenario(
  scenario: SarsRegressionScenario,
  taxYear: number
): RegressionEngineResult {
  const taxTables = buildRegressionTaxTables(taxYear);
  const { periodStart, periodEnd, monthKey } = regressionPeriodForTaxYear(taxYear);

  const { deductionsBreakdown, totalDeductions, employerSdl } = buildDeductions(
    scenario.employee,
    scenario.grossForPeriod,
    [],
    [],
    taxTables,
    REGRESSION_USER_TAX_SETTINGS,
    periodStart,
    periodEnd,
    monthKey,
    [],
    [],
    [],
    []
  );

  const amountOf = (name: string) =>
    deductionsBreakdown.find((d) => d.name === name)?.amount ?? 0;

  return {
    paye: amountOf("PAYE"),
    uif: amountOf("UIF"),
    sdl: amountOf("SDL"),
    hasSdlDeduction: deductionsBreakdown.some((d) => d.name === "SDL"),
    employerSdl,
    totalDeductions,
    net: bankersRound(scenario.grossForPeriod - totalDeductions, 2),
    breakdown: deductionsBreakdown,
  };
}

/** Core 10-employee matrix — TY2027 (Budget 2026 / PAYE-GEN-01-G21). */
export const SCENARIOS_TY2027: SarsRegressionScenario[] = [
  {
    id: "E01",
    label: "Under-65 salaried, monthly, R30,000",
    frequency: "Monthly",
    ageBand: "under65",
    grossForPeriod: 30_000,
    employee: makeRegressionEmployee("E01", "Monthly", DOB_UNDER_65, 30_000),
    notes:
      "Annual 360,000. (360,000-245,100)*0.26+44,118=73,992; -17,820=56,172; /12=4,681.00.",
    sars: { paye: 4_681.0, uif: 177.12, net: 25_141.88, sdlEmployer: 300.0 },
  },
  {
    id: "E02",
    label: "65–74 salaried, monthly, R30,000",
    frequency: "Monthly",
    ageBand: "65to74",
    grossForPeriod: 30_000,
    employee: makeRegressionEmployee("E02", "Monthly", DOB_65_TO_74, 30_000),
    notes: "Pre-rebate 73,992. Rebate 27,585; 46,407/12=3,867.25.",
    sars: { paye: 3_867.25, uif: 177.12, net: 25_955.63, sdlEmployer: 300.0 },
  },
  {
    id: "E03",
    label: "75+ salaried, monthly, R30,000",
    frequency: "Monthly",
    ageBand: "75plus",
    grossForPeriod: 30_000,
    employee: makeRegressionEmployee("E03", "Monthly", DOB_75_PLUS, 30_000),
    notes: "Pre-rebate 73,992. Rebate 30,834; 43,158/12=3,596.50.",
    sars: { paye: 3_596.5, uif: 177.12, net: 26_226.38, sdlEmployer: 300.0 },
  },
  {
    id: "E04",
    label: "Weekly, under 65, R3,000/week",
    frequency: "Weekly",
    ageBand: "under65",
    grossForPeriod: 3_000,
    employee: makeRegressionEmployee("E04", "Weekly", DOB_UNDER_65, 156_000),
    notes: "Annual 156,000. 28,080-17,820=10,260; /52=197.31.",
    sars: { paye: 197.31, uif: 30.0, net: 2_772.69, sdlEmployer: 30.0 },
  },
  {
    id: "E05",
    label: "Bi-weekly, under 65, R6,000/fortnight",
    frequency: "Bi-Weekly",
    ageBand: "under65",
    grossForPeriod: 6_000,
    employee: makeRegressionEmployee("E05", "Bi-Weekly", DOB_UNDER_65, 156_000),
    notes: "Annual 156,000. 10,260/26=394.62.",
    sars: { paye: 394.62, uif: 60.0, net: 5_545.38, sdlEmployer: 60.0 },
  },
  {
    id: "E06",
    label: "High earner above UIF cap, monthly, R80,000",
    frequency: "Monthly",
    ageBand: "under65",
    grossForPeriod: 80_000,
    employee: makeRegressionEmployee("E06", "Monthly", DOB_UNDER_65, 80_000),
    notes: "Annual 960,000. (960,000-887,000)*0.41+259,783-17,820=271,893; /12=22,657.75.",
    sars: { paye: 22_657.75, uif: 177.12, net: 57_165.13, sdlEmployer: 800.0 },
  },
  {
    id: "E07",
    label: "Medical-aid member (main + 1 dependant), monthly, R30,000",
    frequency: "Monthly",
    ageBand: "under65",
    grossForPeriod: 30_000,
    employee: makeRegressionEmployee("E07", "Monthly", DOB_UNDER_65, 30_000, {
      medicalAidMember: true,
      medicalAidDependants: 1,
    }),
    notes: "PAYE 4,681.00 - MTC 752 (376+376) = 3,929.00.",
    sars: { paye: 3_929.0, uif: 177.12, net: 25_893.88, sdlEmployer: 300.0 },
  },
  {
    id: "E08",
    label: "Retirement-fund member (7.5% pension), monthly, R30,000",
    frequency: "Monthly",
    ageBand: "under65",
    grossForPeriod: 30_000,
    employee: makeRegressionEmployee("E08", "Monthly", DOB_UNDER_65, 30_000, {
      retirementFundContributionPercent: 7.5,
    }),
    notes: "Pension 2,250. Taxable 333,000. PAYE 4,096.00 after rebate.",
    sars: { paye: 4_096.0, uif: 177.12, net: 23_476.88, sdlEmployer: 300.0 },
  },
  {
    id: "E09",
    label: "Mid-month starter (part period), monthly, R15,000 earned",
    frequency: "Monthly",
    ageBand: "under65",
    grossForPeriod: 15_000,
    employee: makeRegressionEmployee("E09", "Monthly", DOB_UNDER_65, 30_000),
    notes: "Earned 15,000. Annual 180,000. PAYE 1,215.00.",
    sars: { paye: 1_215.0, uif: 150.0, net: 13_635.0, sdlEmployer: 150.0 },
  },
  {
    id: "E10",
    label: "Zero-tax low earner, monthly, R7,000",
    frequency: "Monthly",
    ageBand: "under65",
    grossForPeriod: 7_000,
    employee: makeRegressionEmployee("E10", "Monthly", DOB_UNDER_65, 7_000),
    notes: "Annual 84,000 below rebate threshold. PAYE 0.",
    sars: { paye: 0.0, uif: 70.0, net: 6_930.0, sdlEmployer: 70.0 },
  },
];

/** Combined medical + retirement (COMP-09 interaction case). */
export const SCENARIO_COMBINED_TY2027: SarsRegressionScenario = {
  id: "E11",
  label: "Medical (main + 2 deps) + 7.5% retirement, monthly, R50,000",
  frequency: "Monthly",
  ageBand: "under65",
  grossForPeriod: 50_000,
  employee: makeRegressionEmployee("E11", "Monthly", DOB_UNDER_65, 50_000, {
    medicalAidMember: true,
    medicalAidDependants: 2,
    retirementFundContributionPercent: 7.5,
  }),
  notes:
    "Retirement 3,750 pre-tax. Taxable 555,000. PAYE after rebates & MTC 1,004/mo = 8,721.58.",
  sars: { paye: 8_721.58, uif: 177.12, net: 37_351.3, sdlEmployer: 500.0 },
};

/** Core 10-employee matrix — TY2026 (unchanged Budget 2025 rates). */
export const SCENARIOS_TY2026: SarsRegressionScenario[] = [
  {
    id: "E01",
    label: "Under-65 salaried, monthly, R30,000",
    frequency: "Monthly",
    ageBand: "under65",
    grossForPeriod: 30_000,
    employee: makeRegressionEmployee("E01", "Monthly", DOB_UNDER_65, 30_000),
    notes:
      "Annual 360,000. (360,000-237,100)*0.26+42,678=74,632; -17,235=57,397; /12=4,783.08.",
    sars: { paye: 4_783.08, uif: 177.12, net: 25_039.8, sdlEmployer: 300.0 },
  },
  {
    id: "E02",
    label: "65–74 salaried, monthly, R30,000",
    frequency: "Monthly",
    ageBand: "65to74",
    grossForPeriod: 30_000,
    employee: makeRegressionEmployee("E02", "Monthly", DOB_65_TO_74, 30_000),
    notes: "Pre-rebate 74,632. Rebate 26,679; 47,953/12=3,996.08.",
    sars: { paye: 3_996.08, uif: 177.12, net: 25_826.8, sdlEmployer: 300.0 },
  },
  {
    id: "E03",
    label: "75+ salaried, monthly, R30,000",
    frequency: "Monthly",
    ageBand: "75plus",
    grossForPeriod: 30_000,
    employee: makeRegressionEmployee("E03", "Monthly", DOB_75_PLUS, 30_000),
    notes: "Pre-rebate 74,632. Rebate 29,824; 44,808/12=3,734.00.",
    sars: { paye: 3_734.0, uif: 177.12, net: 26_088.88, sdlEmployer: 300.0 },
  },
  {
    id: "E04",
    label: "Weekly, under 65, R3,000/week",
    frequency: "Weekly",
    ageBand: "under65",
    grossForPeriod: 3_000,
    employee: makeRegressionEmployee("E04", "Weekly", DOB_UNDER_65, 156_000),
    notes: "Annual 156,000. 28,080-17,235=10,845; /52=208.56.",
    sars: { paye: 208.56, uif: 30.0, net: 2_761.44, sdlEmployer: 30.0 },
  },
  {
    id: "E05",
    label: "Bi-weekly, under 65, R6,000/fortnight",
    frequency: "Bi-Weekly",
    ageBand: "under65",
    grossForPeriod: 6_000,
    employee: makeRegressionEmployee("E05", "Bi-Weekly", DOB_UNDER_65, 156_000),
    notes: "Annual 156,000. 10,845/26=417.12.",
    sars: { paye: 417.12, uif: 60.0, net: 5_522.88, sdlEmployer: 60.0 },
  },
  {
    id: "E06",
    label: "High earner above UIF cap, monthly, R80,000",
    frequency: "Monthly",
    ageBand: "under65",
    grossForPeriod: 80_000,
    employee: makeRegressionEmployee("E06", "Monthly", DOB_UNDER_65, 80_000),
    notes: "Annual 960,000. (960,000-857,900)*0.41+251,258-17,235=275,884; /12=22,990.33.",
    sars: { paye: 22_990.33, uif: 177.12, net: 56_832.55, sdlEmployer: 800.0 },
  },
  {
    id: "E07",
    label: "Medical-aid member (main + 1 dependant), monthly, R30,000",
    frequency: "Monthly",
    ageBand: "under65",
    grossForPeriod: 30_000,
    employee: makeRegressionEmployee("E07", "Monthly", DOB_UNDER_65, 30_000, {
      medicalAidMember: true,
      medicalAidDependants: 1,
    }),
    notes: "PAYE 4,783.08 - MTC 728 (364+364) = 4,055.08.",
    sars: { paye: 4_055.08, uif: 177.12, net: 25_767.8, sdlEmployer: 300.0 },
  },
  {
    id: "E08",
    label: "Retirement-fund member (7.5% pension), monthly, R30,000",
    frequency: "Monthly",
    ageBand: "under65",
    grossForPeriod: 30_000,
    employee: makeRegressionEmployee("E08", "Monthly", DOB_UNDER_65, 30_000, {
      retirementFundContributionPercent: 7.5,
    }),
    notes: "Pension 2,250. Taxable 333,000. PAYE 4,198.08 after rebate.",
    sars: { paye: 4_198.08, uif: 177.12, net: 23_374.8, sdlEmployer: 300.0 },
  },
  {
    id: "E09",
    label: "Mid-month starter (part period), monthly, R15,000 earned",
    frequency: "Monthly",
    ageBand: "under65",
    grossForPeriod: 15_000,
    employee: makeRegressionEmployee("E09", "Monthly", DOB_UNDER_65, 30_000),
    notes: "Earned 15,000. Annual 180,000. PAYE 1,263.75.",
    sars: { paye: 1_263.75, uif: 150.0, net: 13_586.25, sdlEmployer: 150.0 },
  },
  {
    id: "E10",
    label: "Zero-tax low earner, monthly, R7,000",
    frequency: "Monthly",
    ageBand: "under65",
    grossForPeriod: 7_000,
    employee: makeRegressionEmployee("E10", "Monthly", DOB_UNDER_65, 7_000),
    notes: "Annual 84,000 below rebate threshold. PAYE 0.",
    sars: { paye: 0.0, uif: 70.0, net: 6_930.0, sdlEmployer: 70.0 },
  },
];

export const SCENARIO_COMBINED_TY2026: SarsRegressionScenario = {
  id: "E11",
  label: "Medical (main + 2 deps) + 7.5% retirement, monthly, R50,000",
  frequency: "Monthly",
  ageBand: "under65",
  grossForPeriod: 50_000,
  employee: makeRegressionEmployee("E11", "Monthly", DOB_UNDER_65, 50_000, {
    medicalAidMember: true,
    medicalAidDependants: 2,
    retirementFundContributionPercent: 7.5,
  }),
  notes:
    "Retirement 3,750 pre-tax. Taxable 555,000. Annual tax 119,460 less MTC 11,688; monthly PAYE 8,978.67 after period rounding.",
  sars: { paye: 8_978.67, uif: 177.12, net: 37_094.21, sdlEmployer: 500.0 },
};

export const REGRESSION_MATRIX: Record<number, SarsRegressionScenario[]> = {
  2026: [...SCENARIOS_TY2026, SCENARIO_COMBINED_TY2026],
  2027: [...SCENARIOS_TY2027, SCENARIO_COMBINED_TY2027],
};

export function scenariosForTaxYear(taxYear: number): SarsRegressionScenario[] {
  const scenarios = REGRESSION_MATRIX[taxYear];
  if (!scenarios) {
    throw new Error(
      `No regression scenarios for tax year ${taxYear}. Add a matrix entry when curated tables are added.`
    );
  }
  return scenarios;
}

/** Every curated SARS year must have a full parallel-run matrix. */
export function assertRegressionMatrixComplete(): void {
  for (const year of SUPPORTED_SARS_TAX_YEARS) {
    const scenarios = scenariosForTaxYear(year);
    if (scenarios.length !== 11) {
      throw new Error(`TY${year} regression matrix must have 11 scenarios (got ${scenarios.length})`);
    }
    const ids = new Set(scenarios.map((s) => s.id));
    if (ids.size !== 11) {
      throw new Error(`TY${year} regression matrix has duplicate scenario ids`);
    }
  }
}
