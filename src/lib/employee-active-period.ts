import { parseISO } from "date-fns";
import type { MockEmployee } from "@/lib/mock-data-interfaces";

/**
 * Active workforce for a payroll/report period:
 * hired on/before period end, and not terminated before period start.
 */
export function isEmployeeActiveInPeriod(
  employee: Pick<MockEmployee, "startDate" | "terminationDate">,
  periodStart: Date | undefined,
  periodEnd: Date | undefined
): boolean {
  if (!employee.startDate) return false;
  const hireDate = parseISO(employee.startDate);
  if (periodEnd && hireDate > periodEnd) return false;

  if (employee.terminationDate) {
    const terminationDate = parseISO(employee.terminationDate);
    if (periodStart && terminationDate < periodStart) return false;
  }

  return true;
}

export function filterEmployeesActiveInPeriod<T extends Pick<MockEmployee, "startDate" | "terminationDate">>(
  employees: T[],
  periodStart: Date | undefined,
  periodEnd: Date | undefined
): T[] {
  return employees.filter((employee) => isEmployeeActiveInPeriod(employee, periodStart, periodEnd));
}

/**
 * Headcount still employed at a point in time.
 * A last day on or before `asOf` removes the person from the active workforce.
 * Payroll period filters still include them for the month they left.
 */
export function isEmployedAt(
  employee: Pick<MockEmployee, "startDate" | "terminationDate">,
  asOf: Date
): boolean {
  if (employee.startDate && parseISO(employee.startDate) > asOf) return false;
  if (!employee.terminationDate) return true;
  return parseISO(employee.terminationDate) > asOf;
}

export function filterEmployedAt<T extends Pick<MockEmployee, "startDate" | "terminationDate">>(
  employees: T[],
  asOf: Date = new Date()
): T[] {
  return employees.filter((employee) => isEmployedAt(employee, asOf));
}
