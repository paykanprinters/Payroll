import { describe, it, expect } from "vitest";
import { parseISO } from "date-fns";
import {
  allocateOvertime,
  buildEarningsBreakdown,
  buildLeavePayLines,
  collectHolidayBuckets,
  collectLeaveHours,
  collectNonHolidayBuckets,
  computeHolidayAmounts,
} from "@/lib/payroll-calculations/helpers/earnings-helpers";
import type { MockEmployee, TimesheetEntry } from "@/lib/mock-data-interfaces";

const hourly = { id: "emp-1", hourlyRate: 100, payFrequency: "Weekly" } as MockEmployee;
const salaried = { id: "emp-2", salary: 20000, payFrequency: "Monthly" } as MockEmployee;

const day = (date: string, hours: number, leaveType?: TimesheetEntry["leaveType"]): TimesheetEntry => ({
  id: date,
  employeeId: "emp-1",
  date,
  timeIn: "07:45",
  timeOut: "17:00",
  totalWorkHours: hours,
  overtimeHours: 0,
  lateArrival: false,
  earlyDeparture: false,
  absent: false,
  status: "Approved",
  leaveType,
});

// Mon–Thu worked long days, Fri on sick leave.
const week = [
  day("2026-03-02", 11),
  day("2026-03-03", 11),
  day("2026-03-04", 11),
  day("2026-03-05", 11),
  day("2026-03-06", 8.5, "Sick Leave"),
];

describe("weekly overtime threshold", () => {
  it("pays no overtime, even for Saturday or long days, until the week passes 41.25h", () => {
    const shortWeek = [
      day("2026-03-02", 10),
      day("2026-03-03", 10),
      day("2026-03-04", 10),
      day("2026-03-05", 5),
      day("2026-03-07", 5),
    ];
    const alloc = allocateOvertime(collectNonHolidayBuckets(hourly, shortWeek), 41.25);
    expect(alloc.regularHours).toBe(40);
    expect(alloc.overtimeWeekdayHours + alloc.overtimeSaturdayHours + alloc.overtimeSundayHours).toBe(0);
  });

  it("only the hours above 41.25 for the week become overtime", () => {
    const fullWeek = [
      day("2026-03-02", 8.53),
      day("2026-03-03", 8.52),
      day("2026-03-04", 7.27),
      day("2026-03-05", 8.5),
      day("2026-03-06", 8.52),
    ];
    const alloc = allocateOvertime(collectNonHolidayBuckets(hourly, fullWeek), 41.25);
    expect(alloc.regularHours).toBe(41.25);
    expect(alloc.overtimeWeekdayHours).toBeCloseTo(0.09);
  });
});

describe("leave days in payroll", () => {
  it("keeps leave hours out of worked hours so they cannot create overtime", () => {
    const buckets = collectNonHolidayBuckets(hourly, week);
    expect(buckets.weekdayPaidHours).toBe(44);
    const alloc = allocateOvertime(buckets, 41.25);
    expect(alloc.overtimeWeekdayHours).toBeCloseTo(2.75);
  });

  it("pays leave as its own line at the ordinary rate for hourly staff", () => {
    const lines = buildLeavePayLines(hourly, collectLeaveHours(hourly, week), 100);
    expect(lines).toEqual([{ name: "Sick Leave Pay (1 day, 8.50h)", amount: 850 }]);
  });

  it("adds no leave pay line for salaried staff because salary already covers it", () => {
    expect(buildLeavePayLines(salaried, collectLeaveHours(salaried, week), 100)).toEqual([]);
  });
});

describe("public holidays", () => {
  const holidays = [{ userId: "u", name: "Day of Reconciliation", date: "2026-12-16", recurring: false }];
  const settings = {
    userId: "u",
    dailyStartTime: "07:45",
    dailyEndTime: "17:00",
    fridayEndTime: "15:45",
    breakDurationMinutes: 45,
    workDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  };
  const workDays = new Set(settings.workDays);

  it("pays a holiday not worked at 1.0x by default for hourly staff", () => {
    const buckets = collectHolidayBuckets(
      hourly, [], parseISO("2026-12-16"), parseISO("2026-12-22"), workDays, settings, holidays
    );
    expect(buckets.holidayNonWorkedHours).toBe(8.5);
    const amounts = computeHolidayAmounts(buckets.holidayWorkedHours, buckets.holidayNonWorkedHours, 100);
    expect(amounts.nonWorkedAmount).toBe(850);
  });

  it("uses the saved rates in the payslip labels", () => {
    const rules = { holidayNonWorkedMultiplier: 1.0, holidayWorkedMultiplier: 2.5, weekdayOtMultiplier: 1.75 };
    const amounts = computeHolidayAmounts(2, 8.5, 100, rules);
    const { earningsBreakdown } = buildEarningsBreakdown(
      hourly,
      30,
      3000,
      { weekdayAmount: 175, saturdayAmount: 0, sundayAmount: 0 },
      { overtimeWeekdayHours: 1, overtimeSaturdayHours: 0, overtimeSundayHours: 0 },
      amounts,
      { holidayWorkedHours: 2, holidayNonWorkedHours: 8.5 },
      parseISO("2026-12-16"),
      rules
    );
    const names = earningsBreakdown.map((l) => l.name);
    expect(names).toContain("Overtime (Weekday 1.00h @1.75x)");
    expect(names).toContain("Public Holiday (not worked 8.50h @1.0x)");
    expect(names).toContain("Public Holiday (worked 2.00h @2.5x)");
  });

  it("adds nothing for salaried staff on a holiday off, and only the premium when worked", () => {
    const amounts = computeHolidayAmounts(8, 8.5, 100, undefined, { salaried: true });
    expect(amounts.nonWorkedAmount).toBe(0);
    expect(amounts.workedAmount).toBe(800);
  });
});
