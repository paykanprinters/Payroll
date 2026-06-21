import { TimesheetEntry } from "@/lib/mock-data-interfaces";

export interface TimesheetAdminSummary {
  total: number;
  draft: number;
  submitted: number;
  approved: number;
  locked: number;
}

export function buildTimesheetAdminSummary(entries: TimesheetEntry[]): TimesheetAdminSummary {
  return {
    total: entries.length,
    draft: entries.filter((e) => e.status === "Draft").length,
    submitted: entries.filter((e) => e.status === "Submitted").length,
    approved: entries.filter((e) => e.status === "Approved").length,
    locked: entries.filter((e) => e.status === "Locked").length,
  };
}
