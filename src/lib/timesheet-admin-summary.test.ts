import { describe, it, expect } from "vitest";
import { buildTimesheetAdminSummary } from "@/lib/timesheet-admin-summary";
import type { TimesheetEntry } from "@/lib/mock-data-interfaces";

describe("buildTimesheetAdminSummary", () => {
  it("counts statuses in filtered entries", () => {
    const entries = [
      { status: "Draft" },
      { status: "Draft" },
      { status: "Submitted" },
      { status: "Approved" },
      { status: "Locked" },
    ] as TimesheetEntry[];

    expect(buildTimesheetAdminSummary(entries)).toEqual({
      total: 5,
      draft: 2,
      submitted: 1,
      approved: 1,
      locked: 1,
    });
  });
});
