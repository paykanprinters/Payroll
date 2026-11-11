import { eachDayOfInterval, format, parseISO } from "date-fns";
import type { MockEmployee } from "@/lib/mock-data-interfaces";
import type { PublicHoliday } from "@/hooks/use-public-holidays";
import { dayIsHolidayForEmployee } from "@/lib/payroll-calculations/helpers/earnings-helpers";

const DEFAULT_WORK_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const MAX_RANGE_DAYS = 400;

export type HolidayPlaceholder = {
  employeeId: string;
  date: string;
  holidayName: string;
};

export type HolidayOnDate = {
  date: string;
  names: string[];
};

export function publicHolidayTitle(name: string): string {
  return `Public Holiday – ${name}`;
}

function isEmployedOn(employee: MockEmployee, iso: string): boolean {
  if (employee.startDate && iso < employee.startDate.slice(0, 10)) return false;
  if (employee.terminationDate && iso > employee.terminationDate.slice(0, 10)) return false;
  return true;
}

function daysInRange(from: string, to: string): string[] {
  if (!from || !to || from > to) return [];
  const days = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) });
  return days.slice(0, MAX_RANGE_DAYS).map((d) => format(d, "yyyy-MM-dd"));
}

/** Holidays that fall in the range, regardless of department, for a date-level banner. */
export function holidaysInRange(holidays: PublicHoliday[], from: string, to: string): HolidayOnDate[] {
  if (holidays.length === 0) return [];
  const result: HolidayOnDate[] = [];
  for (const iso of daysInRange(from, to)) {
    const names = holidays
      .filter((h) => (h.recurring ? h.date.slice(5) === iso.slice(5) : h.date === iso))
      .map((h) => h.name);
    if (names.length > 0) result.push({ date: iso, names: [...new Set(names)] });
  }
  return result;
}

/**
 * One display-only line per employee scheduled on a holiday they have no clock times for.
 * Never saved: payroll pays an empty holiday as "not worked", so a stored row would turn it into worked time.
 */
export function buildHolidayPlaceholders({
  holidays,
  employees,
  existingKeys,
  from,
  to,
  workDays,
}: {
  holidays: PublicHoliday[];
  employees: MockEmployee[];
  existingKeys: Set<string>;
  from: string;
  to: string;
  workDays?: string[];
}): HolidayPlaceholder[] {
  if (holidays.length === 0) return [];
  const workDaySet = new Set(
    (workDays && workDays.length > 0 ? workDays : DEFAULT_WORK_DAYS).map((d) => d.toLowerCase())
  );
  const placeholders: HolidayPlaceholder[] = [];
  for (const iso of daysInRange(from, to)) {
    if (!workDaySet.has(format(parseISO(iso), "EEEE").toLowerCase())) continue;
    for (const employee of employees) {
      if (!isEmployedOn(employee, iso)) continue;
      if (existingKeys.has(`${employee.id}|${iso}`)) continue;
      const holiday = dayIsHolidayForEmployee(iso, employee, holidays);
      if (holiday) placeholders.push({ employeeId: employee.id, date: iso, holidayName: holiday.name });
    }
  }
  return placeholders;
}
