import { describe, expect, it } from "vitest";
import type { MockEmployee } from "@/lib/mock-data-interfaces";
import type { PublicHoliday } from "@/hooks/use-public-holidays";
import { buildHolidayPlaceholders, holidaysInRange, publicHolidayTitle } from "@/lib/timesheet-holidays";

const employee = (id: string, extra: Partial<MockEmployee> = {}) =>
  ({ id, firstName: id, lastName: "", startDate: "2025-01-01", ...extra }) as MockEmployee;

const votersDay: PublicHoliday = { userId: "u", name: "Voters Days", date: "2026-11-04", recurring: false };
const heritageDay: PublicHoliday = { userId: "u", name: "Heritage Day", date: "2020-09-24", recurring: true };

describe("buildHolidayPlaceholders", () => {
  it("adds a line for each scheduled employee with no clock times on a one-off holiday", () => {
    const result = buildHolidayPlaceholders({
      holidays: [votersDay],
      employees: [employee("a"), employee("b")],
      existingKeys: new Set(["b|2026-11-04"]),
      from: "2026-11-04",
      to: "2026-11-10",
    });
    expect(result).toEqual([{ employeeId: "a", date: "2026-11-04", holidayName: "Voters Days" }]);
  });

  it("skips one-off holidays from other years, non-work days, departments and people not yet employed", () => {
    const result = buildHolidayPlaceholders({
      holidays: [
        { ...votersDay, date: "2025-11-04" },
        { userId: "u", name: "Sat holiday", date: "2026-11-07", recurring: false },
        { userId: "u", name: "Factory only", date: "2026-11-05", recurring: false, departments: ["Factory"] },
      ],
      employees: [employee("a", { department: "Office" }), employee("late", { startDate: "2026-11-06" })],
      existingKeys: new Set(),
      from: "2026-11-04",
      to: "2026-11-10",
    });
    expect(result).toEqual([]);
  });

  it("matches recurring holidays on month and day", () => {
    const result = buildHolidayPlaceholders({
      holidays: [heritageDay],
      employees: [employee("a")],
      existingKeys: new Set(),
      from: "2026-09-21",
      to: "2026-09-27",
    });
    expect(result.map((p) => p.date)).toEqual(["2026-09-24"]);
  });
});

describe("holidaysInRange", () => {
  it("lists each holiday date in the range once", () => {
    expect(holidaysInRange([votersDay, heritageDay], "2026-09-01", "2026-11-30")).toEqual([
      { date: "2026-09-24", names: ["Heritage Day"] },
      { date: "2026-11-04", names: ["Voters Days"] },
    ]);
  });
});

it("formats the holiday title", () => {
  expect(publicHolidayTitle("Voters Days")).toBe("Public Holiday – Voters Days");
});
