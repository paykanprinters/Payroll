import { describe, it, expect } from "vitest";
import {
  buildClosureLeaveRecords,
  buildClosurePreview,
  buildClosureTimesheets,
  closurePayWeeks,
  expandClosureDays,
  lastWorkDayBefore,
  type CompanyClosure,
} from "@/lib/company-closure";
import type { LeaveEntry, MockEmployee } from "@/lib/mock-data-interfaces";

const employee = {
  id: "emp-1",
  customEmployeeId: "KP001",
  firstName: "Test",
  lastName: "User",
  email: "t@example.com",
  jobTitle: "Operator",
  startDate: "2026-01-01",
  hourlyRate: 50,
} as MockEmployee;

const holidays = [
  { userId: "u", name: "Day of Reconciliation", date: "2026-12-16", recurring: false },
  { userId: "u", name: "Christmas Day", date: "2026-12-25", recurring: false },
  { userId: "u", name: "Day of Goodwill", date: "2026-12-26", recurring: false },
  { userId: "u", name: "New Year's Day", date: "2027-01-01", recurring: false },
];

const closure: CompanyClosure = {
  id: "c1",
  name: "December 2026",
  startDate: "2026-12-14",
  endDate: "2027-01-01",
  payoutDate: "2026-12-11",
  status: "draft",
  excludedEmployeeIds: [],
};

describe("expandClosureDays", () => {
  it("books 12 leave days and 3 weekday holidays for 14 Dec 2026 – 1 Jan 2027", () => {
    const days = expandClosureDays({ closure, employee, holidays });
    expect(days.leaveDays).toHaveLength(12);
    expect(days.holidayDays).toEqual(["2026-12-16", "2026-12-25", "2027-01-01"]);
  });

  it("does not book days already on other approved leave", () => {
    const sick: LeaveEntry = {
      id: "s1",
      employeeId: "emp-1",
      leaveType: "Sick Leave",
      startDate: "2026-12-14",
      endDate: "2026-12-14",
      totalDays: 1,
      workingDays: 1,
      status: "Approved",
    };
    const days = expandClosureDays({ closure, employee, holidays, leaveRecords: [sick] });
    expect(days.leaveDays).toHaveLength(11);
    expect(days.alreadyOnLeave).toEqual(["2026-12-14"]);
  });
});

describe("buildClosurePreview", () => {
  it("shows a balance that goes negative as leave in advance", () => {
    const [row] = buildClosurePreview({ closure, employees: [employee], leaveRecords: [], holidays });
    // Cycle runs 1 Jan – 31 Dec 2026; the last closure leave day is 31 Dec, so the full 15 days have accrued.
    expect(row.leaveDays).toBe(12);
    expect(row.segments).toHaveLength(1);
    expect(row.balanceBefore).toBeCloseTo(15, 1);
    expect(row.balanceAfter).toBeCloseTo(3, 1);
    expect(row.advanceDays).toBe(0);

    const lateStarter = { ...employee, id: "emp-2", startDate: "2026-09-01" };
    const [late] = buildClosurePreview({ closure, employees: [lateStarter], leaveRecords: [], holidays });
    expect(late.balanceAfter).toBeLessThan(0);
    expect(late.advanceDays).toBeCloseTo(-late.balanceAfter, 2);
  });

  it("skips excluded employees", () => {
    const rows = buildClosurePreview({
      closure: { ...closure, excludedEmployeeIds: ["emp-1"] },
      employees: [employee],
      leaveRecords: [],
      holidays,
    });
    expect(rows).toEqual([]);
  });
});

describe("buildClosureLeaveRecords", () => {
  it("splits leave at the leave-cycle anniversary", () => {
    const days = expandClosureDays({ closure, employee, holidays }).leaveDays;
    let n = 0;
    const records = buildClosureLeaveRecords({ closure, employee, leaveDays: days, newId: () => `id-${n++}` });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      leaveType: "Annual Leave",
      startDate: "2026-12-14",
      endDate: "2026-12-31",
      workingDays: 12,
      status: "Approved",
      closureId: "c1",
    });

    const midDecemberCycle = { ...employee, leaveCycleStartDate: "2025-12-21" };
    const split = buildClosureLeaveRecords({ closure, employee: midDecemberCycle, leaveDays: days, newId: () => `id-${n++}` });
    expect(split.map((r) => [r.startDate, r.endDate, r.workingDays])).toEqual([
      ["2026-12-14", "2026-12-18", 4],
      ["2026-12-21", "2026-12-31", 8],
    ]);
  });
});

describe("buildClosureTimesheets", () => {
  it("pays 8.5h Monday to Thursday and 7.25h on Friday, skipping existing rows", () => {
    let n = 0;
    const rows = buildClosureTimesheets({
      closure,
      employee,
      leaveDays: ["2026-12-14", "2026-12-15", "2026-12-18"],
      timesheets: [
        {
          id: "x",
          employeeId: "emp-1",
          date: "2026-12-15",
          timeIn: "07:45",
          timeOut: "17:00",
          totalWorkHours: 8.5,
          overtimeHours: 0,
          lateArrival: false,
          earlyDeparture: false,
          absent: false,
          status: "Approved",
        },
      ],
      workHours: { dailyStartTime: "07:45", dailyEndTime: "17:00", fridayEndTime: "15:45", breakDurationMinutes: 45 },
      newId: () => `ts-${n++}`,
    });
    expect(rows.map((r) => [r.date, r.timeOut, r.totalWorkHours])).toEqual([
      ["2026-12-14", "17:00", 8.5],
      ["2026-12-18", "15:45", 7.25],
    ]);
    expect(rows[0]).toMatchObject({ leaveType: "Annual Leave", closureId: "c1", status: "Approved" });
  });
});

describe("closurePayWeeks", () => {
  it("pays the closing week and full shutdown weeks in advance, and the re-opening week normally", () => {
    // Pay week runs Wednesday to Tuesday (cut-off Tuesday = 2).
    const weeks = closurePayWeeks(closure, 2);
    expect(weeks).toEqual([
      { start: "2026-12-09", end: "2026-12-15", kind: "closing", paidInAdvance: true },
      { start: "2026-12-16", end: "2026-12-22", kind: "shutdown", paidInAdvance: true },
      { start: "2026-12-23", end: "2026-12-29", kind: "shutdown", paidInAdvance: true },
      { start: "2026-12-30", end: "2027-01-05", kind: "reopening", paidInAdvance: false },
    ]);
  });
});

describe("lastWorkDayBefore", () => {
  it("defaults the payout to the last work day before the closure", () => {
    expect(lastWorkDayBefore("2026-12-14")).toBe("2026-12-11");
  });
});
