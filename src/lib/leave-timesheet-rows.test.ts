import { describe, it, expect } from "vitest";
import { buildApprovedLeaveRows, mergeLeaveRowsIntoAttendance } from "@/lib/leave-timesheet-rows";
import type { MockEmployee, LeaveEntry } from "@/lib/mock-data-interfaces";

const employee = {
  id: "emp-1",
  customEmployeeId: "KP001",
  personalId: "3",
  firstName: "Test",
  lastName: "User",
  email: "test@example.com",
  jobTitle: "Staff",
  startDate: "2024-01-01",
} as MockEmployee;

const leave = (overrides: Partial<LeaveEntry>): LeaveEntry => ({
  id: "l1",
  employeeId: "emp-1",
  leaveType: "Annual Leave",
  startDate: "2026-03-02",
  endDate: "2026-03-02",
  totalDays: 1,
  workingDays: 1,
  status: "Approved",
  ...overrides,
});

const build = (leaveRecords: LeaveEntry[], extra: Partial<Parameters<typeof buildApprovedLeaveRows>[0]> = {}) =>
  buildApprovedLeaveRows({
    leaveRecords,
    employees: [employee],
    startDate: "2026-03-02",
    endDate: "2026-03-08",
    ...extra,
  });

describe("buildApprovedLeaveRows", () => {
  it("adds a full 07:45–17:00 day per approved leave work day in range", () => {
    const rows = build([leave({ leaveType: "Sick Leave", startDate: "2026-03-05", endDate: "2026-03-09" })]);
    expect(rows.map((r) => r.date)).toEqual(["2026-03-05", "2026-03-06"]);
    expect(rows[0]).toMatchObject({
      employeeId: "emp-1",
      csvPersonalId: "3",
      timeIn: "07:45",
      timeOut: "17:00",
      leaveType: "Sick Leave",
    });
  });

  it("ignores pending, rejected, unpaid, and maternity leave", () => {
    const rows = build([
      leave({ id: "a", status: "Pending" }),
      leave({ id: "b", status: "Rejected", startDate: "2026-03-03", endDate: "2026-03-03" }),
      leave({ id: "c", leaveType: "Unpaid Leave", startDate: "2026-03-04", endDate: "2026-03-04" }),
      leave({ id: "d", leaveType: "Maternity Leave", startDate: "2026-03-05", endDate: "2026-03-05" }),
    ]);
    expect(rows).toEqual([]);
  });

  it("skips public holidays and non-work days", () => {
    const rows = build([leave({ startDate: "2026-03-02", endDate: "2026-03-04" })], {
      workDays: ["monday", "wednesday"],
      holidays: [{ userId: "u", name: "Holiday", date: "2026-03-04", recurring: false }],
    });
    expect(rows.map((r) => r.date)).toEqual(["2026-03-02"]);
  });
});

describe("mergeLeaveRowsIntoAttendance", () => {
  it("replaces punches on a leave day and keeps other days", () => {
    const punches = [
      { employeeId: "emp-1", csvPersonalId: "3", date: "2026-03-02", timeIn: "08:00", timeOut: "08:05" },
      { employeeId: "emp-1", csvPersonalId: "3", date: "2026-03-03", timeIn: "07:40", timeOut: "17:02" },
    ];
    const leaveRows = build([leave({})]);
    const merged = mergeLeaveRowsIntoAttendance(punches, leaveRows);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({ date: "2026-03-02", timeIn: "07:45", leaveType: "Annual Leave" });
    expect(merged[1]).toMatchObject({ date: "2026-03-03", timeIn: "07:40" });
  });
});
