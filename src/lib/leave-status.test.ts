import { describe, it, expect } from "vitest";
import {
  isApprovedLeave,
  isLeaveEffectiveForPayroll,
  normalizeLeaveStatus,
  canStaffCancelLeave,
} from "@/lib/leave-status";
import type { LeaveEntry } from "@/lib/mock-data-interfaces";

describe("leave-status", () => {
  it("defaults unknown status to Approved for legacy rows", () => {
    expect(normalizeLeaveStatus(undefined)).toBe("Approved");
  });

  it("treats only approved leave as payroll-effective", () => {
    expect(isLeaveEffectiveForPayroll({ status: "Approved" })).toBe(true);
    expect(isLeaveEffectiveForPayroll({ status: "Pending" })).toBe(false);
    expect(isLeaveEffectiveForPayroll({ status: "Rejected" })).toBe(false);
  });

  it("allows staff to cancel pending staff requests only", () => {
    const pendingStaff: LeaveEntry = {
      id: "1",
      employeeId: "e1",
      leaveType: "Annual Leave",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      totalDays: 2,
      workingDays: 2,
      status: "Pending",
      source: "staff",
    };
    expect(canStaffCancelLeave(pendingStaff)).toBe(true);
    expect(canStaffCancelLeave({ ...pendingStaff, status: "Approved" })).toBe(false);
    expect(isApprovedLeave({ status: "Approved" })).toBe(true);
  });
});
