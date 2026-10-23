import { format, parse, isBefore, isAfter, addWeeks, subWeeks, addDays, setDay, isWithinInterval } from "date-fns";
import { MockEmployee, LeaveEntry, TimesheetEntry } from "@/lib/mock-data-interfaces";
import { TimesheetFormValues, ImportableTimesheetEntry } from "@/lib/timesheet-types";
import { isLeaveEffectiveForPayroll } from "@/lib/leave-status";

/**
 * Calculates the time difference between two HH:mm time strings in hours.
 * Handles cases where end time might be on the next day.
 */
export const calculateTimeDifferenceInHours = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const startDate = parse(start, "HH:mm", new Date());
  const endDate = parse(end, "HH:mm", new Date());
  if (isBefore(endDate, startDate)) {
    endDate.setDate(endDate.getDate() + 1);
  }
  const diffMs = endDate.getTime() - startDate.getTime();
  return diffMs / (1000 * 60 * 60);
};

type MetricOpts = {
  breakDurationMinutes?: number;
  paidLunch?: boolean;
  dailyStartTime?: string;
  dailyEndTime?: string;
  fridayStartTime?: string;
  fridayEndTime?: string;
  overtimeThresholdHours?: number;
  timeOutGraceMinutes?: number;
};

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

/** Clock-outs within the grace after the scheduled end are paid as ending at the scheduled end. */
export const applyTimeOutGrace = (timeOut: string, expectedEnd: string, graceMinutes: number): string => {
  if (!timeOut || !expectedEnd || graceMinutes <= 0) return timeOut;
  const over = toMinutes(timeOut) - toMinutes(expectedEnd);
  return over > 0 && over <= graceMinutes ? expectedEnd.padStart(5, "0").slice(0, 5) : timeOut;
};

/**
 * Calculates metrics for a single timesheet entry.
 * - Break subtraction respects paidLunch: if paidLunch is true, do not subtract breaks.
 * - Uses configured start/end (with Friday override) to flag late/early.
 */
export const calculateTimesheetMetrics = (
  data: TimesheetFormValues | ImportableTimesheetEntry,
  _employee?: MockEmployee,
  opts?: MetricOpts
) => {
  const entryDate: Date | null = data.date ? new Date(data.date) : null;

  const defaultStart = opts?.dailyStartTime || "09:00";
  const defaultEnd = opts?.dailyEndTime || "17:00";
  const isFriday = entryDate ? entryDate.getDay() === 5 : false;

  const expectedStart = isFriday && opts?.fridayStartTime ? opts.fridayStartTime : defaultStart;
  const expectedEnd = isFriday && opts?.fridayEndTime ? opts.fridayEndTime : defaultEnd;

  let totalWorkHours = 0;
  const overtimeHours = 0; // weekly authority elsewhere
  let lateArrival = false;
  let earlyDeparture = false;
  let absent = false;

  const { timeIn, timeOut } = data;

  if (!timeIn || !timeOut) {
    absent = true;
  } else {
    // Clamp start: if clock-in is before 07:45, ignore time before 07:45
    const earliestStartStr = "07:45";
    const earliestStartDate = parse(earliestStartStr, "HH:mm", new Date());
    const actualTimeInDateForClamp = parse(timeIn, "HH:mm", new Date());
    const timeInEffective = isBefore(actualTimeInDateForClamp, earliestStartDate) ? earliestStartStr : timeIn;

    const timeOutEffective = applyTimeOutGrace(timeOut, expectedEnd, opts?.timeOutGraceMinutes ?? 0);
    const totalShiftDuration = calculateTimeDifferenceInHours(timeInEffective, timeOutEffective);
    const teaDuration = calculateTimeDifferenceInHours(data.teaStart || "", data.teaEnd || "");
    const lunchDuration = calculateTimeDifferenceInHours(data.lunchStart || "", data.lunchEnd || "");

    const configuredBreakHours = (opts?.breakDurationMinutes ?? 45) / 60;
  
    // Determine if fixed unpaid break policy should apply (hourly-paid or weekly/bi-weekly employees)
    const isHourlyOrWeekly =
      !!_employee &&
      (
        (_employee.hourlyRate !== undefined && _employee.hourlyRate !== null && _employee.hourlyRate > 0) ||
        _employee.payFrequency === "Weekly" ||
        _employee.payFrequency === "Bi-Weekly"
      );
  
    // If lunch is paid, subtract nothing; otherwise:
    // - For hourly/weekly employees: subtract exactly the configured fixed break
    // - For others (e.g., monthly salaried): use the larger of configured vs captured breaks (legacy behavior)
    let breakHoursToSubtract = 0;
    if (opts?.paidLunch) {
      breakHoursToSubtract = 0;
    } else if (isHourlyOrWeekly) {
      breakHoursToSubtract = configuredBreakHours;
    } else {
      const capturedBreakHours = (teaDuration + lunchDuration);
      breakHoursToSubtract = Math.max(configuredBreakHours, capturedBreakHours);
    }
  
    totalWorkHours = Math.max(0, totalShiftDuration - breakHoursToSubtract);

    const expectedTimeIn = parse(expectedStart, "HH:mm", new Date());
    const actualTimeIn = parse(timeIn, "HH:mm", new Date());
    if (isAfter(actualTimeIn, expectedTimeIn)) {
      lateArrival = true;
    }
    const expectedTimeOut = parse(expectedEnd, "HH:mm", new Date());
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
export const getWeeklyPeriodContaining = (date: Date, cutOffDay: number) => {
  const targetDayOfWeek = cutOffDay === 7 ? 0 : cutOffDay;
  const candidateCutOff = setDay(date, targetDayOfWeek, { weekStartsOn: 1 });
  const end = candidateCutOff < date ? addWeeks(candidateCutOff, 1) : candidateCutOff;
  const start = addDays(subWeeks(end, 1), 1);
  return { start, end };
};

/**
 * Compute incremental overtime for ONE entry under a weekly threshold.
 * For display only; payroll recomputes weekly totals authoritatively.
 */
export const computeWeeklyIncrementalOvertimeForEntry = (
  employeeId: string,
  entryDateISO: string,
  entryHours: number,
  timesheets: TimesheetEntry[],
  weeklyThreshold: number,
  cutOffDay: number,
  workDays: string[],
  excludeId?: string
): number => {
  const entryDate = parse(entryDateISO, "yyyy-MM-dd", new Date());
  const { start, end } = getWeeklyPeriodContaining(entryDate, cutOffDay);

  const workDaysSet = new Set((workDays || []).map(d => d.toLowerCase()));
  const dayIndex = entryDate.getDay(); // 0=Sun, 6=Sat
  const isSaturdayNonWorking = dayIndex === 6 && !workDaysSet.has("saturday");
  const isSundayNonWorking = dayIndex === 0 && !workDaysSet.has("sunday");

  // If entry falls on a non-working weekend day, all hours are overtime for that entry.
  // Weekend hours should first fill regular time; do not auto-mark as overtime here.

  // Otherwise, compute incremental weekly overtime based on hours worked on working days only.
  let priorHours = 0;
  for (const ts of timesheets) {
    if (ts.employeeId !== employeeId) continue;
    const tsDate = parse(ts.date, "yyyy-MM-dd", new Date());
    if (!isWithinInterval(tsDate, { start, end })) continue;
    if (excludeId && ts.id === excludeId) continue;
    if (ts.leaveType) continue;

    const idx = tsDate.getDay();
    const isSatNonWork = idx === 6 && !workDaysSet.has("saturday");
    const isSunNonWork = idx === 0 && !workDaysSet.has("sunday");

    // Exclude non-working weekend hours from priorHours so they don't affect weekly threshold
    // Include weekend hours toward weekly threshold per policy (no exclusion).

    priorHours += ts.totalWorkHours || 0;
  }

  const overtimeBefore = Math.max(0, priorHours - weeklyThreshold);
  const overtimeAfter = Math.max(0, priorHours + entryHours - weeklyThreshold);
  const incremental = Math.max(0, overtimeAfter - overtimeBefore);

  return Math.min(incremental, entryHours);
};

/**
 * Checks if a given date is a leave day for a specific employee.
 */
export const getLeaveTypeOnDay = (
  employeeId: string,
  date: Date,
  leaveRecords: LeaveEntry[]
): LeaveEntry["leaveType"] | null => {
  const formattedDate = format(date, "yyyy-MM-dd");
  const record = leaveRecords.find(
    (r) =>
      r.employeeId === employeeId &&
      isLeaveEffectiveForPayroll(r) &&
      r.startDate <= formattedDate &&
      r.endDate >= formattedDate
  );
  return record?.leaveType ?? null;
};

export const isLeaveDay = (employeeId: string, date: Date, leaveRecords: LeaveEntry[]) =>
  getLeaveTypeOnDay(employeeId, date, leaveRecords) !== null;