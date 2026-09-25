import { describe, expect, it } from "vitest";
import { filterEmployeesActiveInPeriod, filterEmployedAt, isEmployeeActiveInPeriod, isEmployedAt } from "@/lib/employee-active-period";

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

describe("isEmployedAt", () => {
  it("keeps people whose last day is still ahead and drops those who have already left", () => {
    const asOf = new Date("2026-09-25T12:00:00");
    expect(isEmployedAt({ startDate: "2024-01-01" }, asOf)).toBe(true);
    expect(
      isEmployedAt({ startDate: "2024-01-01", terminationDate: "2026-09-01" }, asOf)
    ).toBe(false);
    expect(
      isEmployedAt({ startDate: "2024-01-01", terminationDate: "2026-10-15" }, asOf)
    ).toBe(true);
    expect(
      filterEmployedAt(
        [
          { id: "active", startDate: "2024-01-01" },
          { id: "left", startDate: "2024-01-01", terminationDate: "2026-08-01" },
        ],
        asOf
      ).map((e) => e.id)
    ).toEqual(["active"]);
  });
});
