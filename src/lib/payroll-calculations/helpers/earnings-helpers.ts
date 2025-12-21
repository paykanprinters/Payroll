import { eachDayOfInterval, format, parseISO, isWithinInterval, differenceInCalendarDays, isSameMonth } from "date-fns";
import { MockEmployee, LeaveEntry, TimesheetEntry } from "@/lib/mock-data-interfaces";
import type { WorkHoursSettings } from "@/hooks/use-work-hours-settings";
import type { PublicHoliday } from "@/hooks/use-public-holidays";
import { calculateWorkingDays } from "@/lib/payroll-calculations";
import { bankersRound } from "@/lib/utils";

/* Internal utilities */
const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const computeWeeklyScheduledHours = (settings?: WorkHoursSettings | null): number => {
  if (!settings) return 35;
  const selected = new Set((settings.workDays || []).map((d) => d.toLowerCase()));
  const has = (name: string) => selected.has(name.toLowerCase());

  const dailyStart = settings.dailyStartTime || "09:00";
  const dailyEnd = settings.dailyEndTime || "17:00";
  const friStart = settings.fridayStartTime || dailyStart;
  const friEnd = settings.fridayEndTime || dailyEnd;
  const breakMinutes = settings.breakDurationMinutes || 0;
  const isPaidLunch = settings.paidLunch === true;

  const subtract = isPaidLunch ? 0 : breakMinutes;
  const baseHours = Math.max(0, (timeToMinutes(dailyEnd) - timeToMinutes(dailyStart) - subtract) / 60);
  const friHours = Math.max(0, (timeToMinutes(friEnd) - timeToMinutes(friStart) - subtract) / 60);

  let total = 0;
  if (has("monday")) total += baseHours;
  if (has("tuesday")) total += baseHours;
  if (has("wednesday")) total += baseHours;
  if (has("thursday")) total += baseHours;
  if (has("friday")) total += friHours;
  if (has("saturday")) total += baseHours;
  if (has("sunday")) total += baseHours;
  return total;
};

const isSameMonthDay = (isoA: string, isoB: string) => {
  const a = parseISO(isoA);
  const b = parseISO(isoB);
  return a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

const dayIsHolidayForEmployee = (
  dateISO: string,
  employee: MockEmployee,
  holidays: PublicHoliday[]
): PublicHoliday | null => {
  for (const h of holidays) {
    const match = h.recurring ? isSameMonthDay(h.date, dateISO) : h.date === dateISO;
    if (!match) continue;
    if (h.departments && h.departments.length > 0) {
      if (!employee.department || !h.departments.includes(employee.department)) continue;
    }
    return h;
  }
  return null;
};

const scheduledHoursForDay = (dateISO: string, settings?: WorkHoursSettings | null): number => {
  if (!settings) return 0;
  const isPaidLunch = settings.paidLunch === true;
  const subtract = isPaidLunch ? 0 : settings.breakDurationMinutes || 0;

  const d = parseISO(dateISO);
  const isFriday = d.getDay() === 5;
  const start = isFriday && settings.fridayStartTime ? settings.fridayStartTime : settings.dailyStartTime || "09:00";
  const end = isFriday && settings.fridayEndTime ? settings.fridayEndTime : settings.dailyEndTime || "17:00";

  const minutes = Math.max(0, timeToMinutes(end) - timeToMinutes(start) - subtract);
  return Math.max(0, minutes / 60);
};

const groupTimesheetsByDate = (entries: TimesheetEntry[]): Record<string, TimesheetEntry[]> => {
  const map: Record<string, TimesheetEntry[]> = {};
  entries.forEach((ts) => {
    (map[ts.date] ||= []).push(ts);
  });
  return map;
};

/* Public helpers */
export const getWeeklyThreshold = (settings?: WorkHoursSettings | null): number => {
  const t = settings?.overtimeThresholdHours;
  return typeof t === "number" && t > 0 ? t : 41.25;
};

export const deriveHourlyRate = (emp: MockEmployee, settings?: WorkHoursSettings | null): number => {
  if (emp.hourlyRate && emp.hourlyRate > 0) return emp.hourlyRate;
  if (emp.salary && emp.salary > 0) {
    const weeklyHours = computeWeeklyScheduledHours(settings);
    if (weeklyHours <= 0) return 0;
    if (emp.payFrequency === "Weekly") return emp.salary / weeklyHours;
    if (emp.payFrequency === "Bi-Weekly") return emp.salary / (2 * weeklyHours);
    const monthlyHours = weeklyHours * 4.3333;
    return emp.salary / monthlyHours;
  }
  return 0;
};

export const computeThresholdForPeriod = (
  emp: MockEmployee,
  weeklyThreshold: number,
  periodStart: Date,
  periodEnd: Date
): number => {
  if (emp.payFrequency === "Bi-Weekly") {
    return weeklyThreshold * 2;
  }
  if (emp.payFrequency === "Monthly") {
    const daysInPeriod = differenceInCalendarDays(periodEnd, periodStart) + 1;
    const approxWeeks = Math.max(1, Math.round(daysInPeriod / 7));
    return weeklyThreshold * approxWeeks;
  }
  return weeklyThreshold;
};

export type NonHolidayHourBuckets = {
  weekdayPaidHours: number;
  saturdayPaidHours: number;
  sundayPaidHours: number;
};

export type HolidayHourBuckets = {
  holidayWorkedHours: number;
  holidayNonWorkedHours: number;
};

export const collectHolidayBuckets = (
  emp: MockEmployee,
  approvedTs: TimesheetEntry[],
  periodStart: Date,
  periodEnd: Date,
  workDaysSet: Set<string>,
  settings?: WorkHoursSettings | null,
  holidays: PublicHoliday[] = []
): HolidayHourBuckets => {
  const buckets: HolidayHourBuckets = { holidayWorkedHours: 0, holidayNonWorkedHours: 0 };
  const tsByDate = groupTimesheetsByDate(approvedTs);

  const days = eachDayOfInterval({ start: periodStart, end: periodEnd });
  days.forEach((day) => {
    const iso = format(day, "yyyy-MM-dd");
    const holiday = dayIsHolidayForEmployee(iso, emp, holidays);
    if (!holiday) return;

    const dayName = format(day, "EEEE").toLowerCase();
    const isSelectedWorkDay = workDaysSet.has(dayName);
    if (!isSelectedWorkDay) return;

    const entries = tsByDate[iso] || [];
    if (entries.length === 0) {
      buckets.holidayNonWorkedHours += scheduledHoursForDay(iso, settings);
    } else {
      buckets.holidayWorkedHours += entries.reduce((s, e) => s + (e.totalWorkHours || 0), 0);
    }
  });

  return buckets;
};

export const collectNonHolidayBuckets = (
  emp: MockEmployee,
  approvedTs: TimesheetEntry[],
  holidays: PublicHoliday[] = []
): NonHolidayHourBuckets => {
  const res: NonHolidayHourBuckets = { weekdayPaidHours: 0, saturdayPaidHours: 0, sundayPaidHours: 0 };

  approvedTs.forEach((ts) => {
    const isHoliday = !!dayIsHolidayForEmployee(ts.date, emp, holidays);
    if (isHoliday) return;

    const hours = ts.totalWorkHours || 0;
    const date = parseISO(ts.date);
    const dow = date.getDay();

    if (dow === 0) res.sundayPaidHours += hours;
    else if (dow === 6) res.saturdayPaidHours += hours;
    else res.weekdayPaidHours += hours;
  });

  return res;
};

export type OvertimeAllocation = {
  regularHours: number;
  overtimeWeekdayHours: number;
  overtimeSaturdayHours: number;
  overtimeSundayHours: number;
};

export const allocateOvertime = (
  buckets: NonHolidayHourBuckets,
  thresholdForPeriod: number
): OvertimeAllocation => {
  const totalNonHoliday = buckets.weekdayPaidHours + buckets.saturdayPaidHours + buckets.sundayPaidHours;
  const regularHours = Math.min(totalNonHoliday, thresholdForPeriod);

  let remainingOT = Math.max(0, totalNonHoliday - thresholdForPeriod);

  const overtimeSundayHours = Math.min(buckets.sundayPaidHours, remainingOT);
  remainingOT -= overtimeSundayHours;

  const overtimeSaturdayHours = Math.min(buckets.saturdayPaidHours, remainingOT);
  remainingOT -= overtimeSaturdayHours;

  const overtimeWeekdayHours = Math.min(buckets.weekdayPaidHours, remainingOT);
  remainingOT -= overtimeWeekdayHours;

  return { regularHours, overtimeWeekdayHours, overtimeSaturdayHours, overtimeSundayHours };
};

export const computeBasicSalary = (
  emp: MockEmployee,
  regularHours: number,
  hourlyRate: number,
  leaveRecords: LeaveEntry[],
  periodStart: Date,
  periodEnd: Date
): number => {
  if (emp.hourlyRate && emp.hourlyRate > 0) {
    return regularHours * hourlyRate;
  }

  if (emp.salary && emp.salary > 0) {
    let basic = emp.salary;
    let unpaidLeaveDaysInPeriod = 0;

    const employeeUnpaidLeave = leaveRecords.filter(
      (rec) =>
        rec.employeeId === emp.id &&
        rec.leaveType === "Unpaid Leave" &&
        (isWithinInterval(new Date(rec.startDate), { start: periodStart, end: periodEnd }) ||
          isWithinInterval(new Date(rec.endDate), { start: periodStart, end: periodEnd }) ||
          (new Date(rec.startDate) < periodStart && new Date(rec.endDate) > periodEnd))
    );

    employeeUnpaidLeave.forEach((rec) => {
      const leaveStart = new Date(rec.startDate);
      const leaveEnd = new Date(rec.endDate);
      const overlapStart = leaveStart > periodStart ? leaveStart : periodStart;
      const overlapEnd = leaveEnd < periodEnd ? leaveEnd : periodEnd;
      unpaidLeaveDaysInPeriod += calculateWorkingDays(overlapStart, overlapEnd);
    });

    if (unpaidLeaveDaysInPeriod > 0) {
      const workingDaysInPeriod = calculateWorkingDays(periodStart, periodEnd) || 1;
      const dailyRate = (emp.salary as number) / workingDaysInPeriod;
      basic -= dailyRate * unpaidLeaveDaysInPeriod;
    }
    return basic;
  }

  return 0;
};

export const computeHolidayAmounts = (
  holidayWorkedHours: number,
  holidayNonWorkedHours: number,
  hourlyRate: number
) => {
  const workedAmount = bankersRound(hourlyRate > 0 ? holidayWorkedHours * hourlyRate * 2.0 : 0, 2);
  const nonWorkedAmount = bankersRound(hourlyRate > 0 ? holidayNonWorkedHours * hourlyRate * 1.5 : 0, 2);
  return { workedAmount, nonWorkedAmount };
};

export const computeOvertimeAmounts = (
  hourlyRate: number,
  overtimeWeekdayHours: number,
  overtimeSaturdayHours: number,
  overtimeSundayHours: number
) => {
  const weekdayAmount = bankersRound(hourlyRate > 0 ? overtimeWeekdayHours * hourlyRate * 1.5 : 0, 2);
  const saturdayAmount = bankersRound(hourlyRate > 0 ? overtimeSaturdayHours * hourlyRate * 1.5 : 0, 2);
  const sundayAmount = bankersRound(hourlyRate > 0 ? overtimeSundayHours * hourlyRate * 2.0 : 0, 2);
  return { weekdayAmount, saturdayAmount, sundayAmount };
};

export const buildEarningsBreakdown = (
  emp: MockEmployee,
  regularHours: number,
  basicSalary: number,
  overtimeAmounts: { weekdayAmount: number; saturdayAmount: number; sundayAmount: number },
  overtimeHours: { overtimeWeekdayHours: number; overtimeSaturdayHours: number; overtimeSundayHours: number },
  holidayAmounts: { workedAmount: number; nonWorkedAmount: number },
  holidayHours: { holidayWorkedHours: number; holidayNonWorkedHours: number },
  periodStart: Date
): { earningsBreakdown: { name: string; amount: number }[]; grossEarnings: number } => {
  const roundedBasic = bankersRound(basicSalary, 2);
  const lines: { name: string; amount: number }[] = [
    {
      name: emp.hourlyRate && emp.hourlyRate > 0
        ? `Regular Hours (${regularHours.toFixed(2)}h)`
        : "Basic Salary",
      amount: roundedBasic,
    },
  ];

  if (overtimeAmounts.weekdayAmount > 0) {
    lines.push({
      name: `Overtime (Weekday ${overtimeHours.overtimeWeekdayHours.toFixed(2)}h @1.5x)`,
      amount: overtimeAmounts.weekdayAmount,
    });
  }
  if (overtimeAmounts.saturdayAmount > 0) {
    lines.push({
      name: `Weekend Overtime (Sat ${overtimeHours.overtimeSaturdayHours.toFixed(2)}h @1.5x)`,
      amount: overtimeAmounts.saturdayAmount,
    });
  }
  if (overtimeAmounts.sundayAmount > 0) {
    lines.push({
      name: `Weekend Overtime (Sun ${overtimeHours.overtimeSundayHours.toFixed(2)}h @2.0x)`,
      amount: overtimeAmounts.sundayAmount,
    });
  }

  if (holidayAmounts.nonWorkedAmount > 0) {
    lines.push({
      name: `Public Holiday (no timesheet ${holidayHours.holidayNonWorkedHours.toFixed(2)}h @1.5x)`,
      amount: holidayAmounts.nonWorkedAmount,
    });
  }
  if (holidayAmounts.workedAmount > 0) {
    lines.push({
      name: `Public Holiday (worked ${holidayHours.holidayWorkedHours.toFixed(2)}h @2.0x)`,
      amount: holidayAmounts.workedAmount,
    });
  }

  if (emp.id === "EMP004" && isSameMonth(periodStart, new Date())) {
    lines.push({ name: "Bonus", amount: bankersRound(2000, 2) });
  }

  const grossEarnings = bankersRound(lines.reduce((sum, e) => sum + e.amount, 0), 2);
  return { earningsBreakdown: lines, grossEarnings };
};