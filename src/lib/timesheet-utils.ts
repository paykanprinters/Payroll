import { format, parse, isBefore, isAfter, eachDayOfInterval, isWeekend } from "date-fns";
import { MockEmployee, LeaveEntry } from "@/lib/mock-data-interfaces";
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
 * - Overtime is computed from net paid hours using overtimeThresholdHours when provided,
 *   otherwise falling back to employee.standardDailyHours (default 8).
 */
export const calculateTimesheetMetrics = (
  data: TimesheetFormValues | ImportableTimesheetEntry,
  employee?: MockEmployee,
  opts?: { breakDurationMinutes?: number; overtimeThresholdHours?: number }
) => {
  const standardDailyHours = employee?.standardDailyHours || 8; // Default to 8 hours

  let totalWorkHours = 0;
  let overtimeHours = 0;
  let lateArrival = false;
  let earlyDeparture = false;
  let absent = false;

  const timeIn = data.timeIn;
  const timeOut = data.timeOut;

  if (!timeIn || !timeOut) {
    absent = true;
  } else {
    const totalShiftDuration = calculateTimeDifferenceInHours(timeIn, timeOut);
    const teaDuration = calculateTimeDifferenceInHours(data.teaStart || "", data.teaEnd || "");
    const lunchDuration = calculateTimeDifferenceInHours(data.lunchStart || "", data.lunchEnd || "");

    // Strict rule: subtract at least the configured unpaid break; if captured breaks exceed it, subtract the larger.
    const configuredBreakHours = (opts?.breakDurationMinutes ?? 0) > 0 ? (opts!.breakDurationMinutes as number) / 60 : 0;
    const capturedBreakHours = teaDuration + lunchDuration;
    const breakHoursToSubtract = Math.max(configuredBreakHours, capturedBreakHours);

    totalWorkHours = Math.max(0, totalShiftDuration - breakHoursToSubtract);

    // Threshold for overtime: configured overtimeThresholdHours if given and > 0, else employee standard hours
    const thresholdHours =
      typeof opts?.overtimeThresholdHours === "number" && (opts!.overtimeThresholdHours as number) > 0
        ? (opts!.overtimeThresholdHours as number)
        : standardDailyHours;

    overtimeHours = Math.max(0, totalWorkHours - thresholdHours);

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