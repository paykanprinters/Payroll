import { format, parse, isBefore, isAfter, eachDayOfInterval, isWeekend, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { MockEmployee, LeaveEntry, TimesheetEntry } from "@/lib/mock-data-interfaces";
import { TimesheetFormValues, ImportableTimesheetEntry } from "@/lib/timesheet-types";

/**
 * Calculates the time difference between two HH:mm time strings in hours.
 * Handles cases where end time might be on the next day.
 */
export const calculateTimeDifferenceInHours = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const startDate = parse(start, "HH:mm", new Date());
  const endDate = parse(end, "HH:mm", new Date());
  if (isBefore(endDate, startDate)) {
    // If end time is before start time, assume it's on the next day for calculation
    endDate.setDate(endDate.getDate() + 1);
  }
  const diffMs = endDate.getTime() - startDate.getTime();
  return diffMs / (1000 * 60 * 60); // Convert milliseconds to hours
};

/**
 * Calculates various metrics for a timesheet entry.
 * - Always subtract at least the configured unpaid break (breakDurationMinutes)
 *   and if captured tea/lunch breaks are longer, subtract the larger amount.
 * - Overtime here is not used for storage; we compute it weekly elsewhere.
 */
export const calculateTimesheetMetrics = (
  data: TimesheetFormValues | ImportableTimesheetEntry,
  employee?: MockEmployee,
  opts?: { breakDurationMinutes?: number; overtimeThresholdHours?: number }
) => {
  const standardDailyHours = employee?.standardDailyHours || 8; // Default to 8 hours

  let totalWorkHours = 0;
  let overtimeHours = 0; // Not authoritative (weekly allocation is used), kept for compatibility
  let lateArrival = false;
  let earlyDeparture = false;
  let absent = false;

  const timeIn = data.timeIn;
  const timeOut = data.timeOut;

  if (!timeIn || !timeOut) {
    absent = true;
    // console.debug("[TimesheetMetrics] Absent", { timeIn, timeOut });
  } else {
    const totalShiftDuration = calculateTimeDifferenceInHours(timeIn, timeOut);
    const teaDuration = calculateTimeDifferenceInHours((data as any).teaStart || "", (data as any).teaEnd || "");
    const lunchDuration = calculateTimeDifferenceInHours((data as any).lunchStart || "", (data as any).lunchEnd || "");

    const configuredBreakHours =
      (opts?.breakDurationMinutes ?? 0) > 0 ? (opts!.breakDurationMinutes as number) / 60 : 0;
    const capturedBreakHours = teaDuration + lunchDuration;
    const breakHoursToSubtract = Math.max(configuredBreakHours, capturedBreakHours);

    totalWorkHours = Math.max(0, totalShiftDuration - breakHoursToSubtract);

    // Daily overtimeHours is not authoritative now (weekly threshold is used). Keep 0 by default or compute daily if needed:
    // const thresholdHours = typeof opts?.overtimeThresholdHours === "number" && (opts!.overtimeThresholdHours as number) > 0
    //   ? (opts!.overtimeThresholdHours as number)
    //   : standardDailyHours;
    // overtimeHours = Math.max(0, totalWorkHours - thresholdHours);

    // Late Arrival / Early Departure (simplified logic)
    const expectedTimeIn = parse("09:00", "HH:mm", new Date());
    const actualTimeIn = parse(timeIn, "HH:mm", new Date());
    if (isAfter(actualTimeIn, expectedTimeIn)) {
      lateArrival = true;
    }
    const expectedTimeOut = parse("17:00", "HH:mm", new Date());
    const actualTimeOut = parse(timeOut, "HH:mm", new Date());
    if (isBefore(actualTimeOut, expectedTimeOut)) {
      earlyDeparture = true;
    }
  }

  return { totalWorkHours, overtimeHours, lateArrival, earlyDeparture, absent };
};

/**
 * Helper: get start and end of the week (Mon–Sun) for a given date.
 */
export const getWeekBounds = (date: Date) => {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return { start, end };
};

/**
 * Compute incremental overtime for ONE entry under a weekly threshold.
 * We allocate only the portion above the threshold to this entry.
 *
 * entryHours: paid hours for the entry (already net of breaks)
 * timesheets: all existing timesheets (used to sum prior hours in the same week)
 * weeklyThreshold: e.g., 45
 * excludeId: optionally exclude a specific id (e.g., when editing existing entry)
 */
export const computeWeeklyIncrementalOvertimeForEntry = (
  employeeId: string,
  entryDateISO: string,
  entryHours: number,
  timesheets: TimesheetEntry[],
  weeklyThreshold: number,
  excludeId?: string
): number => {
  const entryDate = parse(entryDateISO, "yyyy-MM-dd", new Date());
  const { start, end } = getWeekBounds(entryDate);

  // Sum prior hours in same week for this employee (excluding the current id if editing)
  let priorHours = 0;
  for (const ts of timesheets) {
    if (ts.employeeId !== employeeId) continue;
    const tsDate = parse(ts.date, "yyyy-MM-dd", new Date());
    if (!isWithinInterval(tsDate, { start, end })) continue;
    if (excludeId && ts.id === excludeId) continue;
    // Count all hours for the week; for allocating incremental overtime to this entry we
    // assume other entries are "prior" or will be re-allocated on their own update/import.
    priorHours += ts.totalWorkHours || 0;
  }

  const overtimeBefore = Math.max(0, priorHours - weeklyThreshold);
  const overtimeAfter = Math.max(0, priorHours + entryHours - weeklyThreshold);
  const incremental = Math.max(0, overtimeAfter - overtimeBefore);

  // Cap by this entry's hours
  return Math.min(incremental, entryHours);
};

/**
 * Checks if a given date is a leave day for a specific employee.
 */
export const isLeaveDay = (employeeId: string, date: Date, leaveRecords: LeaveEntry[]) => {
  const formattedDate = format(date, "yyyy-MM-dd");
  return leaveRecords.some(
    (record) =>
      record.employeeId === employeeId &&
      record.startDate <= formattedDate &&
      record.endDate >= formattedDate
  );
};