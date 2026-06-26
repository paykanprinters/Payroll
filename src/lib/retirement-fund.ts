import { bankersRound } from "@/lib/utils";
import type { MockEmployee } from "@/lib/mock-data-interfaces";

/**
 * Section 11F retirement-fund contribution caps.
 *
 * Employee contributions to pension, provident and retirement-annuity funds are
 * deductible for income tax, limited to the LESSER of:
 *   - 27.5% of the greater of remuneration or taxable income, and
 *   - R350,000 per year.
 *
 * For PAYE we apply the cap against remuneration on a per-period basis (the
 * annual ceiling is divided by the number of pay periods in the year). The full
 * employee contribution is still withheld from net pay; only the deductible
 * portion reduces the PAYE taxable base.
 */
export const RETIREMENT_FUND_ANNUAL_CAP = 350_000;
export const RETIREMENT_FUND_RATE_CAP = 0.275;

export type PayFrequency = "Monthly" | "Weekly" | "Bi-Weekly";

export function periodsPerYear(frequency: PayFrequency | undefined): number {
  if (frequency === "Weekly") return 52;
  if (frequency === "Bi-Weekly") return 26;
  return 12;
}

export interface RetirementContributionResult {
  /** Full employee contribution withheld this period (reduces net pay). */
  total: number;
  /** Portion that reduces the PAYE taxable base (within Section 11F caps). */
  taxDeductible: number;
  /** Contribution exceeded the 27.5%-of-remuneration ceiling. */
  cappedByRate: boolean;
  /** Contribution exceeded the pro-rated R350,000 annual ceiling. */
  cappedByAnnual: boolean;
}

/**
 * Compute the employee retirement-fund contribution and its tax-deductible
 * portion for a single pay period.
 *
 * @param grossForPeriod remuneration earned in the period (already pro-rated upstream).
 * @param emp employee contribution settings.
 * @param frequency pay frequency (drives the annual-cap proration).
 * @param prorationFactor 0..1 factor for partial pay periods (defaults to a full period).
 */
export function computeRetirementContribution(
  grossForPeriod: number,
  emp: Pick<
    MockEmployee,
    "retirementFundContributionPercent" | "retirementFundContributionFixed"
  >,
  frequency: PayFrequency | undefined,
  prorationFactor: number = 1
): RetirementContributionResult {
  const percent = emp.retirementFundContributionPercent ?? 0;
  const fixed = emp.retirementFundContributionFixed ?? 0;

  const factor = Math.min(1, Math.max(0, prorationFactor));
  const fromPercent = (Math.max(0, grossForPeriod) * Math.max(0, percent)) / 100;
  const fromFixed = Math.max(0, fixed) * factor;
  const total = fromPercent + fromFixed;

  if (total <= 0) {
    return { total: 0, taxDeductible: 0, cappedByRate: false, cappedByAnnual: false };
  }

  const rateCap = RETIREMENT_FUND_RATE_CAP * Math.max(0, grossForPeriod);
  const annualCapForPeriod = (RETIREMENT_FUND_ANNUAL_CAP / periodsPerYear(frequency)) * factor;
  const cap = Math.min(rateCap, annualCapForPeriod);
  const taxDeductible = Math.min(total, cap);

  return {
    total: bankersRound(total, 2),
    taxDeductible: bankersRound(taxDeductible, 2),
    cappedByRate: taxDeductible < total && rateCap <= annualCapForPeriod,
    cappedByAnnual: taxDeductible < total && annualCapForPeriod < rateCap,
  };
}
