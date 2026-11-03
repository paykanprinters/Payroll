import { eachDayOfInterval, format, parseISO, subDays } from "date-fns";
import type { LeaveEntry, MockEmployee, TimesheetEntry } from "@/lib/mock-data-interfaces";
import type { PublicHoliday } from "@/hooks/use-public-holidays";
import { dayIsHolidayForEmployee } from "@/lib/payroll-calculations/helpers/earnings-helpers";
import { isLeaveEffectiveForPayroll } from "@/lib/leave-status";
import { computeEmployeeLeaveBalance, getAnnualLeaveCycle } from "@/lib/leave-accrual";
import { isEmployeeActiveInPeriod } from "@/lib/employee-active-period";
import { calculateTimesheetMetrics, getWeeklyPeriodContaining } from "@/lib/timesheet-utils";
import { leaveDayTimes, type LeaveDaySchedule } from "@/lib/leave-timesheet-rows";

export type CompanyClosureStatus = "draft" | "published";

export interface CompanyClosure {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  payoutDate: string;
  status: CompanyClosureStatus;
  publishedAt?: string | null;
  excludedEmployeeIds: string[];
}

const DEFAULT_WORK_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

const iso = (d: Date) => format(d, "yyyy-MM-dd");

function workDaySet(workDays?: string[]) {
  return new Set((workDays && workDays.length > 0 ? workDays : DEFAULT_WORK_DAYS).map((d) => d.toLowerCase()));
}

/** Days already covered by other approved leave are not booked again. */
function daysOnOtherLeave(employeeId: string, leaveRecords: LeaveEntry[], closureId?: string): Set<string> {
  const days = new Set<string>();
  for (const r of leaveRecords) {
    if (r.employeeId !== employeeId || !isLeaveEffectiveForPayroll(r)) continue;
    if (closureId && r.closureId === closureId) continue;
    for (const d of eachDayOfInterval({ start: parseISO(r.startDate), end: parseISO(r.endDate) })) {
      days.add(iso(d));
    }
  }
  return days;
}

export type ClosureDays = {
  /** Scheduled work days that become Annual Leave. */
  leaveDays: string[];
  /** Public holidays on scheduled work days (paid as holidays, no leave used). */
  holidayDays: string[];
  /** Work days already on other approved leave. */
  alreadyOnLeave: string[];
};

export function expandClosureDays({
  closure,
  employee,
  holidays = [],
  workDays,
  leaveRecords = [],
}: {
  closure: Pick<CompanyClosure, "id" | "startDate" | "endDate">;
  employee: MockEmployee;
  holidays?: PublicHoliday[];
  workDays?: string[];
  leaveRecords?: LeaveEntry[];
}): ClosureDays {
  const result: ClosureDays = { leaveDays: [], holidayDays: [], alreadyOnLeave: [] };
  if (!closure.startDate || !closure.endDate || closure.startDate > closure.endDate) return result;
  const scheduled = workDaySet(workDays);
  const onLeave = daysOnOtherLeave(employee.id, leaveRecords, closure.id);

  for (const day of eachDayOfInterval({ start: parseISO(closure.startDate), end: parseISO(closure.endDate) })) {
    const date = iso(day);
    if (!scheduled.has(format(day, "EEEE").toLowerCase())) continue;
    if (employee.startDate && date < employee.startDate.slice(0, 10)) continue;
    if (employee.terminationDate && date > employee.terminationDate.slice(0, 10)) continue;
    if (dayIsHolidayForEmployee(date, employee, holidays)) {
      result.holidayDays.push(date);
    } else if (onLeave.has(date)) {
      result.alreadyOnLeave.push(date);
    } else {
      result.leaveDays.push(date);
    }
  }
  return result;
}

export function closureEmployees(closure: Pick<CompanyClosure, "startDate" | "endDate" | "excludedEmployeeIds">, employees: MockEmployee[]) {
  const excluded = new Set(closure.excludedEmployeeIds);
  return employees.filter(
    (e) =>
      !excluded.has(e.id) &&
      isEmployeeActiveInPeriod(e, parseISO(closure.startDate), parseISO(closure.endDate))
  );
}

export type ClosureCycleSegment = {
  cycleStart: string;
  cycleEnd: string;
  leaveDays: number;
  balanceBefore: number;
  balanceAfter: number;
};

export type ClosurePreviewRow = {
  employee: MockEmployee;
  leaveDays: number;
  holidayDays: number;
  alreadyOnLeave: number;
  /** Balance in the leave cycle the closure starts in. */
  balanceBefore: number;
  /** Balance after the closure, in the last leave cycle it touches. */
  balanceAfter: number;
  advanceDays: number;
  segments: ClosureCycleSegment[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function groupDaysByLeaveCycle(employee: MockEmployee, days: string[]) {
  const anchor = parseISO(employee.leaveCycleStartDate || employee.startDate || days[0]);
  const groups = new Map<string, { cycleStart: Date; cycleEnd: Date; days: string[] }>();
  for (const day of days) {
    const cycle = getAnnualLeaveCycle(parseISO(day), anchor);
    const key = iso(cycle.cycleStart);
    const group = groups.get(key) || { ...cycle, days: [] };
    group.days.push(day);
    groups.set(key, group);
  }
  return Array.from(groups.values()).sort((a, b) => a.cycleStart.getTime() - b.cycleStart.getTime());
}

/**
 * Leave balance before and after booking the closure. Each leave cycle the closure touches is
 * measured at its own last closure day, so accrual up to the shutdown counts and a cycle that
 * restarts mid-closure (e.g. on 1 January) is not mixed with the previous one.
 */
export function buildClosurePreview({
  closure,
  employees,
  leaveRecords,
  holidays = [],
  workDays,
}: {
  closure: CompanyClosure;
  employees: MockEmployee[];
  leaveRecords: LeaveEntry[];
  holidays?: PublicHoliday[];
  workDays?: string[];
}): ClosurePreviewRow[] {
  const otherLeave = leaveRecords.filter((r) => r.closureId !== closure.id);
  return closureEmployees(closure, employees).map((employee) => {
    const days = expandClosureDays({ closure, employee, holidays, workDays, leaveRecords });
    const segments: ClosureCycleSegment[] = groupDaysByLeaveCycle(employee, days.leaveDays).map((group) => {
      const lastDay = group.days[group.days.length - 1];
      const before = computeEmployeeLeaveBalance(employee, otherLeave, parseISO(lastDay)).annual.remaining;
      return {
        cycleStart: iso(group.cycleStart),
        cycleEnd: iso(group.cycleEnd),
        leaveDays: group.days.length,
        balanceBefore: before,
        balanceAfter: round2(before - group.days.length),
      };
    });
    const fallback = computeEmployeeLeaveBalance(employee, otherLeave, parseISO(closure.startDate)).annual.remaining;
    const balanceBefore = segments[0]?.balanceBefore ?? fallback;
    const balanceAfter = segments[segments.length - 1]?.balanceAfter ?? fallback;
    const advanceDays = round2(segments.reduce((sum, s) => sum + (s.balanceAfter < 0 ? -s.balanceAfter : 0), 0));
    return {
      employee,
      leaveDays: days.leaveDays.length,
      holidayDays: days.holidayDays.length,
      alreadyOnLeave: days.alreadyOnLeave.length,
      balanceBefore,
      balanceAfter,
      advanceDays,
      segments,
    };
  });
}

/**
 * One Annual Leave record per employee per leave cycle, so a closure that crosses the
 * leave-cycle anniversary is deducted from the right cycle.
 */
export function buildClosureLeaveRecords({
  closure,
  employee,
  leaveDays,
  newId,
  now = new Date().toISOString(),
}: {
  closure: Pick<CompanyClosure, "id" | "name">;
  employee: MockEmployee;
  leaveDays: string[];
  newId: () => string;
  now?: string;
}): LeaveEntry[] {
  if (leaveDays.length === 0) return [];
  return groupDaysByLeaveCycle(employee, [...leaveDays].sort()).map(({ days }) => {
    const sorted = [...days].sort();
    const startDate = sorted[0];
    const endDate = sorted[sorted.length - 1];
    const totalDays = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) }).length;
    return {
      id: newId(),
      employeeId: employee.id,
      leaveType: "Annual Leave",
      startDate,
      endDate,
      totalDays,
      workingDays: sorted.length,
      reason: `Company closure: ${closure.name}`,
      status: "Approved",
      source: "admin",
      reviewedAt: now,
      closureId: closure.id,
    } satisfies LeaveEntry;
  });
}

export type ClosureWeekKind = "closing" | "shutdown" | "reopening";

export type ClosurePayWeek = {
  start: string;
  end: string;
  kind: ClosureWeekKind;
  /** Closing and full shutdown weeks are paid on the payout date; the re-opening week is paid normally. */
  paidInAdvance: boolean;
};

/** Pay weeks (cut-off based) touched by the closure. */
export function closurePayWeeks(closure: Pick<CompanyClosure, "startDate" | "endDate">, cutOffDay: number): ClosurePayWeek[] {
  if (!closure.startDate || !closure.endDate || closure.startDate > closure.endDate) return [];
  const weeks: ClosurePayWeek[] = [];
  let cursor = parseISO(closure.startDate);
  const last = parseISO(closure.endDate);
  while (cursor <= last) {
    const { start, end } = getWeeklyPeriodContaining(cursor, cutOffDay);
    const startIso = iso(start);
    const endIso = iso(end);
    const kind: ClosureWeekKind =
      startIso < closure.startDate ? "closing" : endIso > closure.endDate ? "reopening" : "shutdown";
    weeks.push({ start: startIso, end: endIso, kind, paidInAdvance: kind !== "reopening" });
    cursor = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
  }
  return weeks;
}

/** Last scheduled work day before the closure starts (a sensible default payout date). */
export function lastWorkDayBefore(startDate: string, workDays?: string[], holidays: PublicHoliday[] = []): string {
  const scheduled = workDaySet(workDays);
  let day = subDays(parseISO(startDate), 1);
  for (let i = 0; i < 14; i += 1) {
    const date = iso(day);
    const isHoliday = holidays.some((h) => (h.recurring ? h.date.slice(5) === date.slice(5) : h.date === date));
    if (scheduled.has(format(day, "EEEE").toLowerCase()) && !isHoliday) return date;
    day = subDays(day, 1);
  }
  return iso(subDays(parseISO(startDate), 1));
}

export type ClosureWorkHours = LeaveDaySchedule & {
  breakDurationMinutes?: number;
  paidLunch?: boolean;
};

/**
 * Approved Annual Leave timesheet rows for the closure leave days, using the normal day's
 * schedule (shorter on Friday). Days that already have a timesheet are left alone.
 */
export function buildClosureTimesheets({
  closure,
  employee,
  leaveDays,
  timesheets,
  workHours,
  newId,
  now = new Date().toISOString(),
}: {
  closure: Pick<CompanyClosure, "id" | "name">;
  employee: MockEmployee;
  leaveDays: string[];
  timesheets: TimesheetEntry[];
  workHours?: ClosureWorkHours | null;
  newId: () => string;
  now?: string;
}): TimesheetEntry[] {
  const existing = new Set(timesheets.filter((t) => t.employeeId === employee.id).map((t) => t.date));
  return leaveDays
    .filter((date) => !existing.has(date))
    .map((date) => {
      const { timeIn, timeOut } = leaveDayTimes(date, workHours);
      const { totalWorkHours } = calculateTimesheetMetrics(
        { employeeId: employee.id, date: parseISO(date), timeIn, timeOut },
        employee,
        {
          breakDurationMinutes: workHours?.breakDurationMinutes,
          paidLunch: workHours?.paidLunch,
          dailyStartTime: workHours?.dailyStartTime,
          dailyEndTime: workHours?.dailyEndTime,
          fridayStartTime: workHours?.fridayStartTime,
          fridayEndTime: workHours?.fridayEndTime,
        }
      );
      return {
        id: newId(),
        employeeId: employee.id,
        date,
        timeIn,
        timeOut,
        totalWorkHours: Math.round(totalWorkHours * 100) / 100,
        overtimeHours: 0,
        lateArrival: false,
        earlyDeparture: false,
        absent: false,
        leaveType: "Annual Leave",
        closureId: closure.id,
        status: "Approved",
        approvedBy: "Company closure",
        approvedAt: now,
        auditLog: [
          {
            action: `Created from company closure (${closure.name})`,
            timestamp: now,
            user: "System (Closure)",
            captureMethod: "System",
          },
        ],
      } satisfies TimesheetEntry;
    });
}
