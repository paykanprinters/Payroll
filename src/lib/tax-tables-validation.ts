import type { TaxTables } from "@/hooks/use-tax-tables";
import { getSarsTaxTablesForYear, SUPPORTED_SARS_TAX_YEARS } from "@/lib/sars-tax-tables";

/**
 * Tax-table readiness checks (COMP-16).
 *
 * Validates that loaded DB tables are present, structurally complete, and aligned
 * with the curated SARS source in `sars-tax-tables.ts`. Payroll must not run when
 * `isReady` is false.
 */

export type TaxTableValidationSeverity = "error" | "warning" | "info";

export type TaxTableReadinessStatus =
  | "ready"
  | "missing"
  | "incomplete"
  | "stale"
  | "unsupported"
  | "loading";

export interface TaxTableValidationIssue {
  code: string;
  message: string;
  severity: TaxTableValidationSeverity;
}

export interface TaxTableValidationResult {
  taxYear: number;
  status: TaxTableReadinessStatus;
  /** True when there are no error-severity issues. */
  isValid: boolean;
  /** True when payroll may run (no errors; stale/unsupported years block when PAYE applies). */
  isReady: boolean;
  issues: TaxTableValidationIssue[];
  curatedAvailable: boolean;
}

type PayeBracket = TaxTables["payeBrackets"][number];

const PAYE_BRACKET_TOLERANCE = 0.01;

const nearlyEqual = (a: number, b: number, tolerance = PAYE_BRACKET_TOLERANCE): boolean =>
  Math.abs(a - b) <= tolerance;

const comparePayeBrackets = (
  loaded: PayeBracket[],
  curated: PayeBracket[]
): boolean => {
  if (loaded.length !== curated.length) return false;
  for (let i = 0; i < loaded.length; i++) {
    const a = loaded[i];
    const b = curated[i];
    if (
      a.min_income !== b.min_income ||
      a.max_income !== b.max_income ||
      !nearlyEqual(a.rate, b.rate) ||
      !nearlyEqual(a.deduction, b.deduction)
    ) {
      return false;
    }
  }
  return true;
};

/** Validate loaded tax tables for a SARS tax year. */
export function validateLoadedTaxTables(
  taxTables: TaxTables | null,
  taxYear: number,
  options: { isLoading?: boolean; requireUifSdl?: boolean } = {}
): TaxTableValidationResult {
  const { isLoading = false, requireUifSdl = true } = options;
  const issues: TaxTableValidationIssue[] = [];
  const curated = getSarsTaxTablesForYear(taxYear);
  const curatedAvailable = curated !== null;

  if (isLoading) {
    return {
      taxYear,
      status: "loading",
      isValid: false,
      isReady: false,
      issues: [
        {
          code: "loading",
          message: `Tax tables for ${taxYear} are still loading.`,
          severity: "info",
        },
      ],
      curatedAvailable,
    };
  }

  if (!curatedAvailable) {
    issues.push({
      code: "unsupported_year",
      message: `Tax year ${taxYear} is not in the curated SARS table set. Apply tables from Settings > Tax Liabilities after the annual Budget update.`,
      severity: "error",
    });
  }

  if (!taxTables) {
    issues.push({
      code: "missing",
      message: `Tax tables for ${taxYear} are not loaded in the database. An Admin must apply them from Settings > Tax Liabilities.`,
      severity: "error",
    });
    return buildResult(taxYear, "missing", issues, curatedAvailable);
  }

  const { payeBrackets, taxYearDetails, uifSdlRates } = taxTables;

  if (!taxYearDetails) {
    issues.push({
      code: "missing_tax_year",
      message: `Tax year ${taxYear} metadata is missing from the database.`,
      severity: "error",
    });
  } else if (taxYearDetails.year !== taxYear) {
    issues.push({
      code: "year_mismatch",
      message: `Loaded tax year metadata (${taxYearDetails.year}) does not match the active year (${taxYear}).`,
      severity: "error",
    });
  }

  if (!payeBrackets || payeBrackets.length === 0) {
    issues.push({
      code: "missing_paye_brackets",
      message: `No PAYE brackets found for tax year ${taxYear}.`,
      severity: "error",
    });
  } else if (payeBrackets.length < 3) {
    issues.push({
      code: "incomplete_paye_brackets",
      message: `PAYE bracket set for ${taxYear} looks incomplete (${payeBrackets.length} row(s)).`,
      severity: "error",
    });
  }

  if (requireUifSdl && !uifSdlRates) {
    issues.push({
      code: "missing_uif_sdl",
      message: `UIF/SDL rates for tax year ${taxYear} are missing. Re-apply tax tables.`,
      severity: "warning",
    });
  }

  if (curated && taxYearDetails) {
    if (
      taxYearDetails.start_date !== curated.startDate ||
      taxYearDetails.end_date !== curated.endDate
    ) {
      issues.push({
        code: "stale_dates",
        message: `Tax year dates in the database do not match the curated SARS fiscal window for ${taxYear}. Re-apply tax tables.`,
        severity: "warning",
      });
    }

    const rebates = taxYearDetails.rebates;
    if (
      rebates.under65 !== curated.rebates.under65 ||
      rebates.sixtyFiveToSeventyFour !== curated.rebates.sixtyFiveToSeventyFour ||
      rebates.seventyFivePlus !== curated.rebates.seventyFivePlus
    ) {
      issues.push({
        code: "stale_rebates",
        message: `Primary age rebates for ${taxYear} differ from the curated SARS values. Re-apply tax tables after Budget updates.`,
        severity: "warning",
      });
    }
  }

  if (curated && payeBrackets && payeBrackets.length > 0) {
    if (!comparePayeBrackets(payeBrackets, curated.payeBrackets)) {
      issues.push({
        code: "stale_paye_brackets",
        message: `PAYE brackets for ${taxYear} differ from the curated SARS tables. Re-apply tax tables to sync.`,
        severity: "warning",
      });
    }
  }

  if (curated && uifSdlRates) {
    const { uif_rate, uif_cap, sdl_rate } = curated.uifSdlRates;
    if (
      !nearlyEqual(uifSdlRates.uif_rate, uif_rate) ||
      !nearlyEqual(uifSdlRates.uif_cap, uif_cap) ||
      !nearlyEqual(uifSdlRates.sdl_rate, sdl_rate)
    ) {
      issues.push({
        code: "stale_uif_sdl",
        message: `UIF/SDL rates for ${taxYear} differ from curated SARS values. Re-apply tax tables.`,
        severity: "warning",
      });
    }
  }

  const hasErrors = issues.some((i) => i.severity === "error");
  const hasStale = issues.some((i) => i.code.startsWith("stale_"));

  let status: TaxTableReadinessStatus;
  if (!curatedAvailable) status = "unsupported";
  else if (hasErrors) status = "incomplete";
  else if (hasStale) status = "stale";
  else status = "ready";

  const isValid = !hasErrors;
  const isReady = isValid && curatedAvailable && !hasStale && status === "ready";

  return {
    taxYear,
    status,
    isValid,
    isReady,
    issues,
    curatedAvailable,
  };
}

function buildResult(
  taxYear: number,
  status: TaxTableReadinessStatus,
  issues: TaxTableValidationIssue[],
  curatedAvailable: boolean
): TaxTableValidationResult {
  const hasErrors = issues.some((i) => i.severity === "error");
  const hasStale = issues.some((i) => i.code.startsWith("stale_"));
  const isValid = !hasErrors;
  const isReady =
    status === "ready" && isValid && curatedAvailable && !hasStale;

  return {
    taxYear,
    status,
    isValid,
    isReady,
    issues,
    curatedAvailable,
  };
}

/** Human-readable summary for banners and toasts. */
export function getTaxTableStatusLabel(result: TaxTableValidationResult): string {
  switch (result.status) {
    case "ready":
      return "Tax tables ready";
    case "loading":
      return "Loading tax tables…";
    case "missing":
      return "Tax tables not applied";
    case "incomplete":
      return "Tax tables incomplete";
    case "stale":
      return "Tax tables out of date";
    case "unsupported":
      return "Tax year not supported";
    default:
      return "Tax tables unknown";
  }
}

/** Returns the primary blocking message for payroll, if any. */
export function getTaxTableBlockingMessage(result: TaxTableValidationResult): string | null {
  if (result.isReady) return null;
  // Loading is transient — callers should wait, not toast as a failure.
  if (result.status === "loading") return null;
  const error = result.issues.find((i) => i.severity === "error");
  if (error) return error.message;
  const stale = result.issues.find((i) => i.code.startsWith("stale_"));
  if (stale) return stale.message;
  return result.issues[0]?.message ?? `Tax tables for ${result.taxYear} are not ready for payroll.`;
}

export { SUPPORTED_SARS_TAX_YEARS };
