import {
  addMonths,
  addYears,
  differenceInCalendarDays,
  differenceInMonths,
  eachDayOfInterval,
  isWeekend,
  isWithinInterval,
  max,
  min,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";
import type { LeaveEntry, MockEmployee } from "@/lib/mock-data-interfaces";
import { isLeaveEffectiveForPayroll } from "@/lib/leave-status";

/** BCEA-aligned defaults (configurable per employee via annualLeaveEntitlementDays). */
export const BCEA_LEAVE_DEFAULTS = {
  /** Common SA employer practice — BCEA minimum is 21 consecutive calendar days. */
  annualWorkingDaysPerCycle: 15,
  sickDaysPer36MonthCycle: 30,
  sickQualifyingMonths: 6,
  sickDaysPer26DaysWorked: 1,
  daysWorkedDenominatorQualifying: 26,
  familyResponsibilityDaysPerCycle: 3,
  sickCycleMonths: 36,
} as const;

export type LeaveBalanceBucket = {
  entitled: number;
  taken: number;
  remaining: number;
  cycleStart: string;
  cycleEnd: string;
};

export type EmployeeLeaveBalanceSnapshot = {
  asOfDate: string;
  annual: LeaveBalanceBucket;
  sick: LeaveBalanceBucket & { inQualifyingPeriod: boolean };
  familyResponsibility: LeaveBalanceBucket;
};

export type LeaveBalanceValidationResult =
  | { ok: true }
  | { ok: false; message: string; remaining: number };

function roundLeaveDays(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseDate(value: string | undefined, fallback: Date): Date {
  if (!value) return startOfDay(fallback);
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return startOfDay(parseISO(trimmed));
  }
  return startOfDay(parseISO(trimmed));
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getEmploymentAnchor(employee: MockEmployee): Date {
  return parseDate(employee.leaveCycleStartDate || employee.startDate, new Date());
}

function getAnnualEntitlementDays(employee: MockEmployee): number {
  if (employee.annualLeaveEntitlementDays != null && employee.annualLeaveEntitlementDays > 0) {
    return employee.annualLeaveEntitlementDays;
  }
  return BCEA_LEAVE_DEFAULTS.annualWorkingDaysPerCycle;
}

export function getAnnualLeaveCycle(
  asOf: Date,
  anchor: Date
): { cycleStart: Date; cycleEnd: Date } {
  const normalizedAsOf = startOfDay(asOf);
  let cycleStart = startOfDay(anchor);

  while (true) {
    const cycleEnd = subDays(addYears(cycleStart, 1), 1);
    if (normalizedAsOf <= cycleEnd) {
      return { cycleStart, cycleEnd };
    }
    cycleStart = addYears(cycleStart, 1);
  }
}

export function getSickLeaveCycle(
  asOf: Date,
  anchor: Date
): { cycleStart: Date; cycleEnd: Date } {
  const normalizedAsOf = startOfDay(asOf);
  let cycleStart = startOfDay(anchor);

  while (true) {
    const cycleEnd = subDays(addMonths(cycleStart, BCEA_LEAVE_DEFAULTS.sickCycleMonths), 1);
    if (normalizedAsOf <= cycleEnd) {
      return { cycleStart, cycleEnd };
    }
    cycleStart = addMonths(cycleStart, BCEA_LEAVE_DEFAULTS.sickCycleMonths);
  }
}

function proRataEntitlement(
  cycleStart: Date,
  cycleEnd: Date,
  asOf: Date,
  employmentStart: Date,
  fullEntitlement: number
): number {
  const effectiveStart = max([cycleStart, employmentStart]);
  const effectiveEnd = min([asOf, cycleEnd]);
  if (effectiveEnd < effectiveStart) return 0;

  const daysInCycle = differenceInCalendarDays(cycleEnd, cycleStart) + 1;
  const daysElapsed = differenceInCalendarDays(effectiveEnd, effectiveStart) + 1;
  return roundLeaveDays((daysElapsed / daysInCycle) * fullEntitlement);
}

function countWeekdaysBetween(start: Date, end: Date): number {
  if (end < start) return 0;
  return eachDayOfInterval({ start, end }).filter((day) => !isWeekend(day)).length;
}

function leaveRecordDaysInRange(
  record: LeaveEntry,
  rangeStart: Date,
  rangeEnd: Date
): number {
  if (record.workingDays != null && record.workingDays > 0) {
    const leaveStart = parseISO(record.startDate);
    const leaveEnd = parseISO(record.endDate);
    if (leaveEnd < rangeStart || leaveStart > rangeEnd) return 0;
    return record.workingDays;
  }

  const leaveStart = parseISO(record.startDate);
  const leaveEnd = parseISO(record.endDate);
  const overlapStart = max([leaveStart, rangeStart]);
  const overlapEnd = min([leaveEnd, rangeEnd]);
  if (overlapEnd < overlapStart) return 0;
  return countWeekdaysBetween(overlapStart, overlapEnd);
}

export function sumLeaveTakenInRange(
  employeeId: string,
  leaveRecords: LeaveEntry[],
  leaveType: LeaveEntry["leaveType"],
  rangeStart: Date,
  rangeEnd: Date,
  excludeRecordId?: string
): number {
  return leaveRecords
    .filter(
      (record) =>
        record.employeeId === employeeId &&
        record.leaveType === leaveType &&
        isLeaveEffectiveForPayroll(record) &&
        record.id !== excludeRecordId
    )
    .reduce((total, record) => total + leaveRecordDaysInRange(record, rangeStart, rangeEnd), 0);
}

function countWeekdaysWorked(
  employeeId: string,
  employmentStart: Date,
  asOf: Date,
  leaveRecords: LeaveEntry[]
): number {
  const weekdays = countWeekdaysBetween(employmentStart, asOf);
  const unpaidLeave = sumLeaveTakenInRange(
    employeeId,
    leaveRecords,
    "Unpaid Leave",
    employmentStart,
    asOf
  );
  return Math.max(0, weekdays - unpaidLeave);
}

function isFirstAnnualCycle(cycleStart: Date, anchor: Date): boolean {
  return cycleStart.getTime() === startOfDay(anchor).getTime();
}

function isFirstSickCycle(cycleStart: Date, anchor: Date): boolean {
  return cycleStart.getTime() === startOfDay(anchor).getTime();
}

export function computeEmployeeLeaveBalance(
  employee: MockEmployee,
  leaveRecords: LeaveEntry[],
  asOf: Date = new Date(),
  options?: { excludeRecordId?: string }
): EmployeeLeaveBalanceSnapshot {
  const asOfDay = startOfDay(asOf);
  const employmentStart = getEmploymentAnchor(employee);
  const annualCycle = getAnnualLeaveCycle(asOfDay, employmentStart);
  const sickCycle = getSickLeaveCycle(asOfDay, employmentStart);
  const monthsEmployed = differenceInMonths(asOfDay, employmentStart);
  const inQualifyingPeriod = monthsEmployed < BCEA_LEAVE_DEFAULTS.sickQualifyingMonths;

  const annualFull = getAnnualEntitlementDays(employee);
  let annualEntitled = proRataEntitlement(
    annualCycle.cycleStart,
    annualCycle.cycleEnd,
    asOfDay,
    employmentStart,
    annualFull
  );

  if (
    isFirstAnnualCycle(annualCycle.cycleStart, employmentStart) &&
    employee.leaveOpeningAnnualBalance != null
  ) {
    annualEntitled = roundLeaveDays(annualEntitled + employee.leaveOpeningAnnualBalance);
  }

  const annualTaken = sumLeaveTakenInRange(
    employee.id,
    leaveRecords,
    "Annual Leave",
    annualCycle.cycleStart,
    asOfDay,
    options?.excludeRecordId
  );

  let sickEntitled: number;
  if (inQualifyingPeriod) {
    const daysWorked = countWeekdaysWorked(employee.id, employmentStart, asOfDay, leaveRecords);
    sickEntitled = Math.floor(
      daysWorked / BCEA_LEAVE_DEFAULTS.daysWorkedDenominatorQualifying
    );
  } else {
    sickEntitled = proRataEntitlement(
      sickCycle.cycleStart,
      sickCycle.cycleEnd,
      asOfDay,
      employmentStart,
      BCEA_LEAVE_DEFAULTS.sickDaysPer36MonthCycle
    );
    if (
      isFirstSickCycle(sickCycle.cycleStart, employmentStart) &&
      employee.leaveOpeningSickBalance != null
    ) {
      sickEntitled = roundLeaveDays(sickEntitled + employee.leaveOpeningSickBalance);
    }
  }

  const sickTaken = sumLeaveTakenInRange(
    employee.id,
    leaveRecords,
    "Sick Leave",
    inQualifyingPeriod ? employmentStart : sickCycle.cycleStart,
    asOfDay,
    options?.excludeRecordId
  );

  let familyEntitled = proRataEntitlement(
    annualCycle.cycleStart,
    annualCycle.cycleEnd,
    asOfDay,
    employmentStart,
    BCEA_LEAVE_DEFAULTS.familyResponsibilityDaysPerCycle
  );

  if (
    isFirstAnnualCycle(annualCycle.cycleStart, employmentStart) &&
    employee.leaveOpeningFamilyBalance != null
  ) {
    familyEntitled = roundLeaveDays(familyEntitled + employee.leaveOpeningFamilyBalance);
  }

  const familyTaken = sumLeaveTakenInRange(
    employee.id,
    leaveRecords,
    "Family Responsibility Leave",
    annualCycle.cycleStart,
    asOfDay,
    options?.excludeRecordId
  );

  const bucket = (
    entitled: number,
    taken: number,
    cycleStart: Date,
    cycleEnd: Date
  ): LeaveBalanceBucket => ({
    entitled: roundLeaveDays(entitled),
    taken: roundLeaveDays(taken),
    remaining: roundLeaveDays(Math.max(0, entitled - taken)),
    cycleStart: toIsoDate(cycleStart),
    cycleEnd: toIsoDate(cycleEnd),
  });

  return {
    asOfDate: toIsoDate(asOfDay),
    annual: bucket(annualEntitled, annualTaken, annualCycle.cycleStart, annualCycle.cycleEnd),
    sick: {
      ...bucket(
        sickEntitled,
        sickTaken,
        inQualifyingPeriod ? employmentStart : sickCycle.cycleStart,
        inQualifyingPeriod
          ? addMonths(employmentStart, BCEA_LEAVE_DEFAULTS.sickQualifyingMonths)
          : sickCycle.cycleEnd
      ),
      inQualifyingPeriod,
    },
    familyResponsibility: bucket(
      familyEntitled,
      familyTaken,
      annualCycle.cycleStart,
      annualCycle.cycleEnd
    ),
  };
}

const BALANCE_CHECKED_LEAVE_TYPES: LeaveEntry["leaveType"][] = [
  "Annual Leave",
  "Sick Leave",
  "Family Responsibility Leave",
];

export function validateLeaveAgainstBalance(
  employee: MockEmployee,
  leaveRecords: LeaveEntry[],
  proposed: Pick<LeaveEntry, "leaveType" | "workingDays" | "startDate" | "endDate"> &
    Partial<Pick<LeaveEntry, "id">>,
  asOf: Date = new Date()
): LeaveBalanceValidationResult {
  if (!BALANCE_CHECKED_LEAVE_TYPES.includes(proposed.leaveType)) {
    return { ok: true };
  }

  const daysRequested =
    proposed.workingDays > 0
      ? proposed.workingDays
      : countWeekdaysBetween(parseISO(proposed.startDate), parseISO(proposed.endDate));

  if (daysRequested <= 0) {
    return { ok: false, message: "Leave request must include at least one working day.", remaining: 0 };
  }

  const snapshot = computeEmployeeLeaveBalance(employee, leaveRecords, asOf, {
    excludeRecordId: proposed.id,
  });

  const bucket =
    proposed.leaveType === "Annual Leave"
      ? snapshot.annual
      : proposed.leaveType === "Sick Leave"
        ? snapshot.sick
        : snapshot.familyResponsibility;

  if (daysRequested > bucket.remaining) {
    const label =
      proposed.leaveType === "Annual Leave"
        ? "annual leave"
        : proposed.leaveType === "Sick Leave"
          ? "sick leave"
          : "family responsibility leave";
    return {
      ok: false,
      message: `Insufficient ${label} balance. Requested ${daysRequested} day(s); ${bucket.remaining} remaining in the current cycle.`,
      remaining: bucket.remaining,
    };
  }

  return { ok: true };
}

/** True when approved leave overlaps a date range (for calendar/report helpers). */
export function isLeaveOnDay(
  employeeId: string,
  day: Date,
  leaveRecords: LeaveEntry[]
): boolean {
  return leaveRecords.some((record) => {
    if (record.employeeId !== employeeId || !isLeaveEffectiveForPayroll(record)) return false;
    const start = parseISO(record.startDate);
    const end = parseISO(record.endDate);
    return isWithinInterval(day, { start, end });
  });
}
