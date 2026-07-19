import { describe, expect, it } from "vitest";
import { filterEmployeesActiveInPeriod, isEmployeeActiveInPeriod } from "@/lib/employee-active-period";

describe("isEmployeeActiveInPeriod", () => {
  const periodStart = new Date("2026-07-01");
  const periodEnd = new Date("2026-07-31");

  it("excludes employees terminated before the period", () => {
    expect(
      isEmployeeActiveInPeriod(
        { startDate: "2024-01-01", terminationDate: "2026-06-30" },
        periodStart,
        periodEnd
      )
    ).toBe(false);
  });

  it("includes employees terminated during the period", () => {
    expect(
      isEmployeeActiveInPeriod(
        { startDate: "2024-01-01", terminationDate: "2026-07-15" },
        periodStart,
        periodEnd
      )
    ).toBe(true);
  });

  it("excludes employees hired after the period", () => {
    expect(
      isEmployeeActiveInPeriod(
        { startDate: "2026-08-01" },
        periodStart,
        periodEnd
      )
    ).toBe(false);
  });

  it("filters lists for payroll readiness", () => {
    const employees = [
      { id: "a", startDate: "2024-01-01", terminationDate: "2026-06-01" },
      { id: "b", startDate: "2024-01-01" },
    ];
    expect(filterEmployeesActiveInPeriod(employees, periodStart, periodEnd).map((e) => e.id)).toEqual([
      "b",
    ]);
  });
});
