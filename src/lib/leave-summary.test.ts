import { describe, it, expect } from "vitest";
import { countUnpaidLeaveDays, calculateLeaveSummary } from "@/lib/leave-summary";
import type { MockEmployee, LeaveEntry } from "@/lib/mock-data-interfaces";

const employee = {
  id: "emp-1",
} as MockEmployee;

const periodStart = new Date("2026-03-02T00:00:00"); // Monday
const periodEnd = new Date("2026-03-06T00:00:00"); // Friday

describe("countUnpaidLeaveDays", () => {
  it("counts weekdays only within the pay period", () => {
    const leaveRecords: LeaveEntry[] = [
      {
        id: "l1",
        employeeId: "emp-1",
        leaveType: "Unpaid Leave",
        startDate: "2026-03-02",
        endDate: "2026-03-04",
        status: "Approved",
      } as LeaveEntry,
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
        status: "Approved",
      } as LeaveEntry,
    ];
    expect(countUnpaidLeaveDays(employee, leaveRecords, periodStart, periodEnd)).toBe(0);
  });
});

describe("calculateLeaveSummary", () => {
  it("reduces annual balance for leave taken in period", () => {
    const leaveRecords: LeaveEntry[] = [
      {
        id: "l3",
        employeeId: "emp-1",
        leaveType: "Annual Leave",
        startDate: "2026-03-03",
        endDate: "2026-03-04",
        status: "Approved",
      } as LeaveEntry,
    ];
    const summary = calculateLeaveSummary(employee, leaveRecords, periodStart, periodEnd, 0);
    expect(summary.annual).toBe(18);
    expect(summary.sick).toBe(10);
    expect(summary.unpaid).toBe(0);
  });
});
