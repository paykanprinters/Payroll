import { describe, expect, it } from "vitest";
import {
  computeSarsTaxYearBounds,
  filterPayslipsForSarsTaxYear,
  getSarsTaxYearBounds,
  getSarsTaxYearEndDay,
  getSarsTaxYearForDate,
  isLeapYear,
  isPayslipInSarsTaxYear,
} from "@/lib/tax-year-period";
import { SUPPORTED_SARS_TAX_YEARS } from "@/lib/sars-tax-tables";
import type { MockPayslip } from "@/lib/mock-data-interfaces";

const slip = (payPeriod: string, employeeId = "e1"): MockPayslip =>
  ({
    id: payPeriod,
    employeeId,
    payPeriod,
    payDate: "01/03/2026",
    grossEarnings: 1000,
    totalDeductions: 100,
    netPay: 900,
    earningsBreakdown: [],
    deductionsBreakdown: [],
    leaveSummary: { annual: 0, sick: 0, unpaid: 0 },
    ytdGrossEarnings: 0,
    ytdTotalDeductions: 0,
  }) as MockPayslip;

describe("getSarsTaxYearBounds", () => {
  it("returns Mar–Feb window for TY2027", () => {
    expect(getSarsTaxYearBounds(2027)).toEqual({
      start: "2026-03-01",
      end: "2027-02-28",
    });
  });

  it("returns Mar–Feb window for TY2026", () => {
    expect(getSarsTaxYearBounds(2026)).toEqual({
      start: "2025-03-01",
      end: "2026-02-28",
    });
  });
});

describe("isLeapYear", () => {
  it("applies the Gregorian rule (4 / 100 / 400)", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2028)).toBe(true);
    expect(isLeapYear(2027)).toBe(false);
    expect(isLeapYear(1900)).toBe(false); // divisible by 100, not 400
    expect(isLeapYear(2000)).toBe(true); // divisible by 400
    expect(isLeapYear(2100)).toBe(false); // divisible by 100, not 400
  });
});

describe("leap-safe tax-year end dates (COMP-06)", () => {
  it("ends on 29 Feb for leap tax years, 28 Feb otherwise", () => {
    expect(getSarsTaxYearEndDay(2024)).toBe(29);
    expect(getSarsTaxYearEndDay(2028)).toBe(29);
    expect(getSarsTaxYearEndDay(2027)).toBe(28);
    expect(getSarsTaxYearEndDay(2100)).toBe(28);
  });

  it("computes the full fiscal window leap-safely for any year", () => {
    expect(computeSarsTaxYearBounds(2028)).toEqual({
      start: "2027-03-01",
      end: "2028-02-29",
    });
    expect(computeSarsTaxYearBounds(2024)).toEqual({
      start: "2023-03-01",
      end: "2024-02-29",
    });
    expect(computeSarsTaxYearBounds(2027)).toEqual({
      start: "2026-03-01",
      end: "2027-02-28",
    });
  });

  it("includes a 29 Feb pay period in a leap tax year and excludes it from the next", () => {
    const leapDaySlip = slip("2028-02-29 - 2028-02-29");
    expect(isPayslipInSarsTaxYear(leapDaySlip, 2028)).toBe(true);
    expect(isPayslipInSarsTaxYear(leapDaySlip, 2029)).toBe(false);
  });

  it("falls back to the leap-safe computed window when no curated table exists", () => {
    // 2028 is not in the curated tables yet, but bounds must still resolve.
    expect(getSarsTaxYearBounds(2028)).toEqual({
      start: "2027-03-01",
      end: "2028-02-29",
    });
  });

  it("curated tax-table dates match the leap-safe computation (guards future entries)", () => {
    for (const year of SUPPORTED_SARS_TAX_YEARS) {
      expect(getSarsTaxYearBounds(year)).toEqual(computeSarsTaxYearBounds(year));
    }
  });
});

describe("getSarsTaxYearForDate (COMP-17)", () => {
  // Use the local-time numeric constructor (month is 0-based) so results do not
  // depend on the runner's timezone.
  it("maps March–December to the next calendar year (tax year N)", () => {
    expect(getSarsTaxYearForDate(new Date(2026, 2, 1))).toBe(2027);
    expect(getSarsTaxYearForDate(new Date(2026, 5, 26))).toBe(2027);
    expect(getSarsTaxYearForDate(new Date(2026, 11, 31))).toBe(2027);
  });

  it("maps January–February to the current calendar year (tax year N)", () => {
    expect(getSarsTaxYearForDate(new Date(2027, 0, 15))).toBe(2027);
    expect(getSarsTaxYearForDate(new Date(2027, 1, 28))).toBe(2027);
  });

  it("rolls into the next tax year exactly on 1 March", () => {
    expect(getSarsTaxYearForDate(new Date(2027, 1, 28))).toBe(2027);
    expect(getSarsTaxYearForDate(new Date(2027, 2, 1))).toBe(2028);
  });
});

describe("isPayslipInSarsTaxYear", () => {
  it("includes Mar 2026 and Feb 2027 in TY2027 (not calendar 2027)", () => {
    expect(isPayslipInSarsTaxYear(slip("2026-03-01 - 2026-03-31"), 2027)).toBe(true);
    expect(isPayslipInSarsTaxYear(slip("2027-02-01 - 2027-02-28"), 2027)).toBe(true);
    expect(isPayslipInSarsTaxYear(slip("2027-03-01 - 2027-03-31"), 2027)).toBe(false);
    expect(isPayslipInSarsTaxYear(slip("2026-02-01 - 2026-02-28"), 2027)).toBe(false);
  });
});

describe("filterPayslipsForSarsTaxYear", () => {
  const payslips = [
    slip("2026-03-01 - 2026-03-31", "e1"),
    slip("2027-02-01 - 2027-02-28", "e1"),
    slip("2027-03-01 - 2027-03-31", "e1"),
    slip("2026-03-01 - 2026-03-31", "e2"),
  ];

  it("filters by SA tax year and optional employee", () => {
    const ty2027 = filterPayslipsForSarsTaxYear(payslips, 2027);
    expect(ty2027.map((p) => p.id)).toEqual([
      "2026-03-01 - 2026-03-31",
      "2027-02-01 - 2027-02-28",
      "2026-03-01 - 2026-03-31",
    ]);

    const e1Only = filterPayslipsForSarsTaxYear(payslips, 2027, "e1");
    expect(e1Only).toHaveLength(2);
    expect(e1Only.every((p) => p.employeeId === "e1")).toBe(true);
  });
});
