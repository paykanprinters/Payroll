import { describe, expect, it } from "vitest";
import { buildSarsTaxYearDetails, getSarsTaxTablesForYear } from "@/lib/sars-tax-tables";
import type { TaxTables } from "@/hooks/use-tax-tables";
import {
  getTaxTableBlockingMessage,
  getTaxTableStatusLabel,
  validateLoadedTaxTables,
} from "@/lib/tax-tables-validation";

const buildValidTables = (taxYear: number): TaxTables => {
  const curated = getSarsTaxTablesForYear(taxYear)!;
  return {
    payeBrackets: curated.payeBrackets,
    uifSdlRates: curated.uifSdlRates,
    taxYearDetails: buildSarsTaxYearDetails(taxYear)!,
  };
};

describe("tax-tables validation (COMP-16)", () => {
  it("reports ready when loaded tables match curated SARS source", () => {
    const result = validateLoadedTaxTables(buildValidTables(2027), 2027);
    expect(result.status).toBe("ready");
    expect(result.isReady).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(getTaxTableStatusLabel(result)).toBe("Tax tables ready");
    expect(getTaxTableBlockingMessage(result)).toBeNull();
  });

  it("blocks payroll when tables are missing from the database", () => {
    const result = validateLoadedTaxTables(null, 2027);
    expect(result.status).toBe("missing");
    expect(result.isReady).toBe(false);
    expect(result.issues.some((i) => i.code === "missing")).toBe(true);
    expect(getTaxTableBlockingMessage(result)).toContain("not loaded");
  });

  it("flags stale PAYE brackets when DB values differ from curated tables", () => {
    const tables = buildValidTables(2027);
    const stale = {
      ...tables,
      payeBrackets: tables.payeBrackets.map((b, i) =>
        i === 0 ? { ...b, max_income: 999_999 } : b
      ),
    };
    const result = validateLoadedTaxTables(stale, 2027);
    expect(result.status).toBe("stale");
    expect(result.isReady).toBe(false);
    expect(result.issues.some((i) => i.code === "stale_paye_brackets")).toBe(true);
  });

  it("flags unsupported tax years not in the curated set", () => {
    const result = validateLoadedTaxTables(null, 2020);
    expect(result.status).toBe("missing");
    expect(result.curatedAvailable).toBe(false);
    expect(result.issues.some((i) => i.code === "unsupported_year")).toBe(true);
  });

  it("reports incomplete when PAYE brackets are absent", () => {
    const tables = buildValidTables(2027);
    const result = validateLoadedTaxTables({ ...tables, payeBrackets: [] }, 2027);
    expect(result.status).toBe("incomplete");
    expect(result.isReady).toBe(false);
    expect(result.issues.some((i) => i.code === "missing_paye_brackets")).toBe(true);
  });

  it("reports loading state without treating as ready", () => {
    const result = validateLoadedTaxTables(null, 2027, { isLoading: true });
    expect(result.status).toBe("loading");
    expect(result.isReady).toBe(false);
    expect(getTaxTableBlockingMessage(result)).toBeNull();
  });
});
