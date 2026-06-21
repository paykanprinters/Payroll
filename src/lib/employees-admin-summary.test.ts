import { describe, it, expect } from "vitest";
import { buildEmployeesAdminSummary } from "@/lib/employees-admin-summary";
import type { MockEmployee } from "@/lib/mock-data-interfaces";

describe("buildEmployeesAdminSummary", () => {
  it("summarizes filtered employees and chart data", () => {
    const employees = [
      {
        id: "1",
        customEmployeeId: "EMP-001",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        jobTitle: "Manager",
        salary: 20000,
        startDate: "2024-01-01",
        portalAccess: true,
        userId: "user-1",
      },
      {
        id: "2",
        customEmployeeId: "EMP-002",
        firstName: "John",
        lastName: "Smith",
        email: "john@example.com",
        jobTitle: "Operator",
        hourlyRate: 100,
        startDate: "2024-02-01",
        portalAccess: false,
      },
      {
        id: "3",
        customEmployeeId: "EMP-003",
        firstName: "Pat",
        lastName: "Lee",
        email: "pat@example.com",
        jobTitle: "Manager",
        salary: 18000,
        startDate: "2024-03-01",
        portalAccess: true,
      },
    ] as MockEmployee[];

    const summary = buildEmployeesAdminSummary(employees);

    expect(summary.total).toBe(3);
    expect(summary.salaryCount).toBe(2);
    expect(summary.hourlyCount).toBe(1);
    expect(summary.portalEnabledCount).toBe(2);
    expect(summary.portalLinkedCount).toBe(1);
    expect(summary.jobTitleDistribution).toEqual([
      { name: "Manager", value: 2 },
      { name: "Operator", value: 1 },
    ]);
    expect(summary.averageSalaryByJobTitle).toHaveLength(2);
    expect(summary.averageSalaryByJobTitle.find((row) => row.name === "Manager")?.salary).toBe(19000);
    expect(summary.averageSalaryByJobTitle.find((row) => row.name === "Operator")?.salary).toBe(16000);
  });
});
