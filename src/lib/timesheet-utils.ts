import { format, parse, isBefore, isAfter, eachDayOfInterval, isWeekend } from "date-fns";
import { MockEmployee, LeaveEntry } from "@/lib/mock-data-interfaces";
import { TimesheetFormValues, ImportableTimesheetEntry } from "@/lib/timesheet-types"; // Import types from new file

/**
 * Calculates the time difference between two HH:mm time strings in hours.
 * Handles cases where end time might be on the next day.
 */
export const calculateTimeDifferenceInHours = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const startDate = parse(start, 'HH:mm', new Date());
  const endDate = parse(end, 'HH:mm', new Date());
  if (isBefore(endDate, startDate)) {
    // If end time is before start time, assume it's on the next day for calculation
    endDate.setDate(endDate.getDate() + 1);
  }
  const diffMs = endDate.getTime() - startDate.getTime();
  return diffMs / (1000 * 60 * 60); // Convert milliseconds to hours
};

/**
 * Calculates various metrics for a timesheet entry.
 */
export const calculateTimesheetMetrics = (
  data: TimesheetFormValues | ImportableTimesheetEntry,
  employee?: MockEmployee
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

    totalWorkHours = totalShiftDuration - teaDuration - lunchDuration;
    overtimeHours = Math.max(0, totalWorkHours - standardDailyHours);

    // Late Arrival / Early Departure (simplified logic)
    const expectedTimeIn = parse("09:00", 'HH:mm', new Date());
    const actualTimeIn = parse(timeIn, 'HH:mm', new Date());
    if (isAfter(actualTimeIn, expectedTimeIn)) {
      lateArrival = true;
    }

    const expectedTimeOut = parse("17:00", 'HH:mm', new Date());
    const actualTimeOut = parse(timeOut, 'HH:mm', new Date());
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