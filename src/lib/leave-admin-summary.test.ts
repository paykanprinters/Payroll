import { describe, it, expect } from "vitest";
import { buildLeaveAdminSummary, filterLeaveRecords } from "@/lib/leave-admin-summary";
import type { LeaveEntry, MockEmployee } from "@/lib/mock-data-interfaces";

const employees = [
  {
    id: "emp-1",
    customEmployeeId: "EMP-001",
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    jobTitle: "Manager",
    startDate: "2024-01-01",
  },
  {
    id: "emp-2",
    customEmployeeId: "EMP-002",
    firstName: "John",
    lastName: "Smith",
    email: "john@example.com",
    jobTitle: "Operator",
    startDate: "2024-01-01",
  },
] as MockEmployee[];

const records = [
  {
    id: "l1",
    employeeId: "emp-1",
    leaveType: "Annual Leave",
    startDate: "2026-03-02",
    endDate: "2026-03-04",
    totalDays: 3,
    workingDays: 3,
    reason: "Holiday",
  },
  {
    id: "l2",
    employeeId: "emp-2",
    leaveType: "Sick Leave",
    startDate: "2026-03-10",
    endDate: "2026-03-11",
    totalDays: 2,
    workingDays: 2,
  },
  {
    id: "l3",
    employeeId: "emp-1",
    leaveType: "Unpaid Leave",
    startDate: "2026-04-01",
    endDate: "2026-04-01",
    totalDays: 1,
    workingDays: 1,
  },
] as LeaveEntry[];

describe("buildLeaveAdminSummary", () => {
  it("summarizes working days and chart data", () => {
    const summary = buildLeaveAdminSummary(records);

    expect(summary.total).toBe(3);
    expect(summary.workingDays).toBe(6);
    expect(summary.annualDays).toBe(3);
    expect(summary.sickDays).toBe(2);
    expect(summary.unpaidDays).toBe(1);
    expect(summary.uniqueEmployees).toBe(2);
    expect(summary.leaveTypeDistribution).toHaveLength(3);
    expect(summary.monthlyLeaveData.length).toBeGreaterThan(0);
  });
});

describe("filterLeaveRecords", () => {
  it("filters by employee, type, dates, and search", () => {
    const filtered = filterLeaveRecords(records, employees, {
      employeeId: "emp-1",
      leaveType: "Annual Leave",
      status: "all",
      dateStart: "2026-03-01",
      dateEnd: "2026-03-31",
      search: "holiday",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("l1");
  });
});
