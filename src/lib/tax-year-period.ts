import { endOfDay, isWithinInterval, parseISO, startOfDay } from "date-fns";
import { buildSarsTaxYearDetails, getSarsTaxTablesForYear } from "@/lib/sars-tax-tables";
import type { MockPayslip } from "@/lib/mock-data-interfaces";

/** Gregorian leap-year rule: divisible by 4, except centuries not divisible by 400. */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Last day of February for a SARS tax year. A tax year N ends in February of
 * year N, so leap-year handling depends on N (e.g. TY2024 and TY2028 end on
 * 29 Feb; TY2100 ends on 28 Feb because 2100 is not a leap year).
 */
export function getSarsTaxYearEndDay(taxYear: number): 28 | 29 {
  return isLeapYear(taxYear) ? 29 : 28;
}

/**
 * Deterministic, leap-safe SA fiscal window for any tax year N:
 * 1 March (N-1) → 28/29 February (N). This does not require curated tax tables,
 * so it is always available for date filtering even before rates are loaded.
 */
export function computeSarsTaxYearBounds(taxYear: number): { start: string; end: string } {
  const start = `${taxYear - 1}-03-01`;
  const end = `${taxYear}-02-${getSarsTaxYearEndDay(taxYear)}`;
  return { start, end };
}

/**
 * SA fiscal window for a SARS tax year (e.g. TY2027 = 2026-03-01 … 2027-02-28).
 * Prefers the curated tax-table dates when present, otherwise falls back to the
 * leap-safe computed window so filtering works for any year.
 */
export function getSarsTaxYearBounds(taxYear: number): { start: string; end: string } {
  const details = buildSarsTaxYearDetails(taxYear);
  if (details) return { start: details.start_date, end: details.end_date };
  return computeSarsTaxYearBounds(taxYear);
}

/** Parse the pay-period start date from a payslip's `payPeriod` string. */
export function parsePayslipPeriodStart(payPeriod: string): Date | null {
  const start = payPeriod?.split(" - ")?.[0]?.trim();
  if (!start) return null;
  try {
    const d = parseISO(start);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** True when the payslip's period start falls inside the SA fiscal window for `taxYear`. */
export function isPayslipInSarsTaxYear(
  payslip: Pick<MockPayslip, "payPeriod">,
  taxYear: number
): boolean {
  const periodStart = parsePayslipPeriodStart(payslip.payPeriod);
  if (!periodStart) return false;

  const bounds = getSarsTaxYearBounds(taxYear);
  const windowStart = startOfDay(parseISO(bounds.start));
  const windowEnd = endOfDay(parseISO(bounds.end));
  return isWithinInterval(periodStart, { start: windowStart, end: windowEnd });
}

/** Filter payslips to a SARS tax year (Mar–Feb), optionally scoped to one employee. */
export function filterPayslipsForSarsTaxYear(
  payslips: MockPayslip[],
  taxYear: number,
  employeeId?: string
): MockPayslip[] {
  return payslips.filter((p) => {
    if (employeeId && p.employeeId !== employeeId) return false;
    return isPayslipInSarsTaxYear(p, taxYear);
  });
}

/** Human-readable SA fiscal window label, e.g. "1 March 2026 – 28 February 2027". */
export function getSarsTaxYearPeriodLabel(taxYear: number): string {
  const tables = getSarsTaxTablesForYear(taxYear);
  return tables?.periodLabel ?? `Tax year ${taxYear}`;
}

/** Tax year label from a date picker value (year component = SARS tax year). */
export function taxYearFromSelectedDate(selectedDate: Date): number {
  return selectedDate.getFullYear();
}

/**
 * SARS tax year that a calendar date falls into. A tax year N runs
 * 1 March (N-1) → 28/29 February (N), so January and February belong to the
 * current calendar year, while March onward belongs to the next calendar year.
 *
 * Used by the annual-Budget freshness gate (COMP-17) to detect when curated
 * tables for the live tax year are missing.
 */
export function getSarsTaxYearForDate(date: Date): number {
  const month = date.getMonth(); // 0 = Jan … 11 = Dec
  const year = date.getFullYear();
  return month >= 2 ? year + 1 : year;
}
