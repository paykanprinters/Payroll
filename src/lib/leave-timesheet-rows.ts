import { eachDayOfInterval, format, parseISO } from "date-fns";
import type { LeaveEntry, MockEmployee } from "@/lib/mock-data-interfaces";
import type { ParsedTimesheetRow } from "@/hooks/use-timesheet-import";
import type { PublicHoliday } from "@/hooks/use-public-holidays";
import { isLeaveEffectiveForPayroll } from "@/lib/leave-status";
import { dayIsHolidayForEmployee } from "@/lib/payroll-calculations/helpers/earnings-helpers";

export const LEAVE_DAY_TIME_IN = "07:45";
export const LEAVE_DAY_TIME_OUT = "17:00";

/** Leave types the employer pays as a normal day. Unpaid leave is deducted elsewhere; maternity is UIF-funded. */
export const PAID_TIMESHEET_LEAVE_TYPES: LeaveEntry["leaveType"][] = [
  "Annual Leave",
  "Sick Leave",
  "Family Responsibility Leave",
];

const DEFAULT_WORK_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

type LeaveRow = Omit<ParsedTimesheetRow, "_isValid" | "_errors">;

const LEAVE_DAY_LABELS: Record<LeaveEntry["leaveType"], string> = {
  "Annual Leave": "Leave",
  "Sick Leave": "Sick",
  "Family Responsibility Leave": "Family leave",
  "Unpaid Leave": "Unpaid leave",
  "Maternity Leave": "Maternity leave",
};

export function leaveDayLabel(leaveType?: LeaveEntry["leaveType"] | null): string | null {
  if (!leaveType) return null;
  return LEAVE_DAY_LABELS[leaveType] ?? "Leave";
}

/**
 * One full-day row (07:45–17:00) per employee per scheduled work day covered by approved paid leave.
 * Public holidays are skipped because payroll already pays those days separately.
 */
export function buildApprovedLeaveRows({
  leaveRecords,
  employees,
  startDate,
  endDate,
  workDays,
  holidays = [],
}: {
  leaveRecords: LeaveEntry[];
  employees: MockEmployee[];
  startDate: string;
  endDate: string;
  workDays?: string[];
  holidays?: PublicHoliday[];
}): LeaveRow[] {
  if (!startDate || !endDate || startDate > endDate) return [];

  const workDaySet = new Set(
    (workDays && workDays.length > 0 ? workDays : DEFAULT_WORK_DAYS).map((d) => d.toLowerCase())
  );
  const employeesById = new Map(employees.map((e) => [e.id, e]));
  const rowsByKey = new Map<string, LeaveRow>();

  for (const record of leaveRecords) {
    if (!isLeaveEffectiveForPayroll(record)) continue;
    if (!PAID_TIMESHEET_LEAVE_TYPES.includes(record.leaveType)) continue;
    const employee = employeesById.get(record.employeeId);
    if (!employee) continue;

    const from = record.startDate > startDate ? record.startDate : startDate;
    const to = record.endDate < endDate ? record.endDate : endDate;
    if (from > to) continue;

    for (const day of eachDayOfInterval({ start: parseISO(from), end: parseISO(to) })) {
      const iso = format(day, "yyyy-MM-dd");
      if (!workDaySet.has(format(day, "EEEE").toLowerCase())) continue;
      if (employee.startDate && iso < employee.startDate.slice(0, 10)) continue;
      if (employee.terminationDate && iso > employee.terminationDate.slice(0, 10)) continue;
      if (dayIsHolidayForEmployee(iso, employee, holidays)) continue;

      rowsByKey.set(`${employee.id}|${iso}`, {
        employeeId: employee.id,
        csvPersonalId: employee.personalId || employee.customEmployeeId || "Unknown",
        date: iso,
        timeIn: LEAVE_DAY_TIME_IN,
        timeOut: LEAVE_DAY_TIME_OUT,
        leaveType: record.leaveType,
      });
    }
  }

  return Array.from(rowsByKey.values());
}

/** Approved leave replaces any punches on the same employee/day. */
export function mergeLeaveRowsIntoAttendance<T extends LeaveRow>(attendanceRows: T[], leaveRows: T[]): T[] {
  const leaveKeys = new Set(leaveRows.map((r) => `${r.employeeId}|${r.date}`));
  const merged = [
    ...attendanceRows.filter((r) => !leaveKeys.has(`${r.employeeId}|${r.date}`)),
    ...leaveRows,
  ];
  merged.sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return String(a.csvPersonalId).localeCompare(String(b.csvPersonalId), undefined, { numeric: true });
  });
  return merged;
}
