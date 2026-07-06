import { describe, it, expect } from "vitest";
import { parseISO } from "date-fns";
import { countUnpaidLeaveDays, calculateLeaveSummary } from "@/lib/leave-summary";
import type { MockEmployee, LeaveEntry } from "@/lib/mock-data-interfaces";

const employee = {
  id: "emp-1",
  customEmployeeId: "KP001",
  firstName: "Test",
  lastName: "User",
  email: "test@example.com",
  jobTitle: "Staff",
  startDate: "2024-01-01",
} as MockEmployee;

const periodStart = new Date("2026-03-02T00:00:00");
const periodEnd = new Date("2026-03-06T00:00:00");

describe("countUnpaidLeaveDays", () => {
  it("counts weekdays only within the pay period", () => {
    const leaveRecords: LeaveEntry[] = [
      {
        id: "l1",
        employeeId: "emp-1",
        leaveType: "Unpaid Leave",
        startDate: "2026-03-02",
        endDate: "2026-03-04",
        totalDays: 3,
        workingDays: 3,
        status: "Approved",
      },
    ];
    expect(countUnpaidLeaveDays(employee, leaveRecords, periodStart, periodEnd)).toBe(3);
  });

  it("ignores leave outside the period", () => {
    const leaveRecords: LeaveEntry[] = [
      {
        id: "l2",
        employeeId: "emp-1",
        leaveType: "Unpaid Leave",
        startDate: "2026-02-01",
        endDate: "2026-02-05",
        totalDays: 5,
        workingDays: 5,
        status: "Approved",
      },
    ];
    expect(countUnpaidLeaveDays(employee, leaveRecords, periodStart, periodEnd)).toBe(0);
  });
});

describe("calculateLeaveSummary", () => {
  it("returns BCEA accrual balances as of period end", () => {
    const leaveRecords: LeaveEntry[] = [
      {
        id: "l3",
        employeeId: "emp-1",
        leaveType: "Annual Leave",
        startDate: "2026-01-06",
        endDate: "2026-01-10",
        totalDays: 5,
        workingDays: 1,
        status: "Approved",
      },
    ];
    const summary = calculateLeaveSummary(
      employee,
      leaveRecords,
      parseISO("2026-03-02"),
      parseISO("2026-06-30"),
      0
    );
    expect(summary.annual).toBeGreaterThan(0);
    expect(summary.sick).toBeGreaterThan(0);
    expect(summary.unpaid).toBe(0);
    expect(summary.family).toBeGreaterThan(0);
  });
});
