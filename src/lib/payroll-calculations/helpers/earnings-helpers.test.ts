import { describe, it, expect } from "vitest";
import {
  allocateOvertime,
  buildLeavePayLines,
  collectLeaveHours,
  collectNonHolidayBuckets,
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
