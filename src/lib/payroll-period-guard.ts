import { format } from "date-fns";

/** Calendar date from a `yyyy-MM-dd` run field, without a UTC day shift. */
export function calendarDateFromIso(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/** Stored payslip key, e.g. "2026-09-15 - 2026-09-21". */
export function formatPayrollPeriod(periodStart: Date, periodEnd: Date): string {
  return `${format(periodStart, "yyyy-MM-dd")} - ${format(periodEnd, "yyyy-MM-dd")}`;
}

export function payslipsForPayrollPeriod<T extends { payPeriod: string }>(
  payslips: T[],
  periodStart: Date,
  periodEnd: Date
): T[] {
  const periodKey = formatPayrollPeriod(periodStart, periodEnd);
  return payslips.filter((payslip) => payslip.payPeriod === periodKey);
}
