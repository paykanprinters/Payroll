import { describe, it, expect } from "vitest";
import { applyTimeOutGrace, calculateTimesheetMetrics } from "@/lib/timesheet-utils";
import type { MockEmployee } from "@/lib/mock-data-interfaces";

const hourly = { id: "emp-1", hourlyRate: 100, payFrequency: "Weekly" } as MockEmployee;
const opts = { dailyStartTime: "07:45", dailyEndTime: "17:00", breakDurationMinutes: 45, timeOutGraceMinutes: 15 };
// 2026-03-03 is a Tuesday.
const entry = (timeOut: string) => ({
  employeeId: "emp-1",
  date: new Date("2026-03-03T00:00:00"),
  timeIn: "07:45",
  timeOut,
});

describe("clock-out grace", () => {
  it("treats a clock-out within the grace as ending on time", () => {
    expect(applyTimeOutGrace("17:12", "17:00", 15)).toBe("17:00");
    expect(applyTimeOutGrace("17:15", "17:00", 15)).toBe("17:00");
  });

  it("keeps the full clock-out beyond the grace, before the end, or with grace off", () => {
    expect(applyTimeOutGrace("17:16", "17:00", 15)).toBe("17:16");
    expect(applyTimeOutGrace("16:50", "17:00", 15)).toBe("16:50");
    expect(applyTimeOutGrace("17:10", "17:00", 0)).toBe("17:10");
  });

  it("pays a full day for a clock-out inside the grace and the extra time beyond it", () => {
    expect(calculateTimesheetMetrics(entry("17:10"), hourly, opts).totalWorkHours).toBeCloseTo(8.5);
    expect(calculateTimesheetMetrics(entry("18:00"), hourly, opts).totalWorkHours).toBeCloseTo(9.5);
  });

  it("uses the Friday end time on Fridays", () => {
    const friday = { ...entry("14:10"), date: new Date("2026-03-06T00:00:00") };
    const fridayOpts = { ...opts, fridayEndTime: "14:00" };
    expect(calculateTimesheetMetrics(friday, hourly, fridayOpts).totalWorkHours).toBeCloseTo(5.5);
  });
});
