import { describe, expect, it } from "vitest";
import { buildCalendarEvents, eventsOnDay, payPeriodEnds, sarsDueDate } from "@/lib/payroll-calendar";
import type { LeaveEntry, MockEmployee } from "@/lib/mock-data-interfaces";
import type { PayrollRun } from "@/integrations/supabase/payroll-run-queries";

const holidays = [
  { userId: "u", name: "Day of Reconciliation", date: "2025-12-16", recurring: true },
  { userId: "u", name: "Christmas Day", date: "2025-12-25", recurring: true },
  { userId: "u", name: "Day of Goodwill", date: "2025-12-26", recurring: true },
  { userId: "u", name: "New Year's Day", date: "2026-01-01", recurring: true },
  { userId: "u", name: "Freedom Day", date: "2027-04-27", recurring: false },
];

const employees = [
  { id: "e1", firstName: "Thandi", lastName: "Nkosi", startDate: "2016-12-01", dateOfBirth: "1990-12-03" },
  { id: "e2", firstName: "Pieter", lastName: "Smit", startDate: "2026-12-07", terminationDate: "2026-12-31" },
] as MockEmployee[];

const weekly = { payCycleType: "Weekly" as const, cutOffDay: 2, payDayOffset: 0 };

describe("buildCalendarEvents", () => {
  const events = buildCalendarEvents({ holidays, employees, payCycle: weekly }, "2026-12-01", "2026-12-31", "2026-12-10");

  it("repeats recurring holidays in the year shown and skips one-off holidays from other years", () => {
    const names = events.filter((e) => e.category === "holiday").map((e) => [e.start, e.title]);
    expect(names).toEqual([
      ["2026-12-16", "Day of Reconciliation"],
      ["2026-12-25", "Christmas Day"],
      ["2026-12-26", "Day of Goodwill"],
    ]);
  });

  it("lists a pay day for every weekly cut-off, flags missed ones, and warns about holidays", () => {
    const pay = events.filter((e) => e.category === "payroll");
    expect(pay.map((e) => e.start)).toEqual(["2026-12-01", "2026-12-08", "2026-12-15", "2026-12-22", "2026-12-29"]);
    expect(pay[0]).toMatchObject({ title: "Pay day · no payroll run", warning: true });
    expect(pay[2]).toMatchObject({ title: "Pay day", tentative: true });
  });

  it("adds the EMP201 due date for the previous month", () => {
    const emp201 = events.find((e) => e.category === "statutory");
    expect(emp201).toMatchObject({ start: "2026-12-07", title: "EMP201 due" });
    expect(emp201?.detail).toContain("November 2026");
  });

  it("shows birthdays, 10 years of service, first and last days", () => {
    const people = events.filter((e) => e.category === "people").map((e) => e.title);
    expect(people).toEqual(
      expect.arrayContaining([
        "Thandi Nkosi: 10 years of service",
        "Thandi Nkosi: birthday",
        "Pieter Smit: first day",
        "Pieter Smit: last day",
      ])
    );
  });
});

describe("payroll runs, leave and closures", () => {
  const runs = [
    { id: "r1", userId: null, periodStart: "2026-11-25", periodEnd: "2026-12-01", payCycleType: "Weekly", status: "Paid" },
    { id: "r2", userId: null, periodStart: "2026-12-02", periodEnd: "2026-12-08", payCycleType: "Weekly", status: "Cancelled" },
  ] as PayrollRun[];
  const leave = [
    { id: "l1", employeeId: "e1", leaveType: "Annual Leave", startDate: "2026-12-02", endDate: "2026-12-04", totalDays: 3, workingDays: 3, status: "Pending" },
    { id: "l2", employeeId: "e1", leaveType: "Sick Leave", startDate: "2026-12-09", endDate: "2026-12-09", totalDays: 1, workingDays: 1, status: "Rejected" },
    { id: "l3", employeeId: "e1", leaveType: "Annual Leave", startDate: "2026-12-18", endDate: "2026-12-31", totalDays: 14, workingDays: 9, status: "Approved", closureId: "c1" },
  ] as LeaveEntry[];
  const closures = [
    { id: "c1", name: "December shutdown", startDate: "2026-12-18", endDate: "2027-01-10", payoutDate: "2026-12-17", status: "draft" as const, excludedEmployeeIds: [] },
  ];
  const events = buildCalendarEvents(
    { holidays, employees, payCycle: weekly, runs, leaveRecords: leave, closures },
    "2026-12-01",
    "2026-12-31",
    "2026-12-10"
  );

  it("uses the run status on its pay day and ignores cancelled runs", () => {
    expect(eventsOnDay(events, "2026-12-01").find((e) => e.category === "payroll")).toMatchObject({
      title: "Pay day · run Paid",
      href: "/payroll/runs/r1",
    });
    expect(eventsOnDay(events, "2026-12-08").find((e) => e.category === "payroll")?.title).toBe("Pay day · no payroll run");
  });

  it("shows approved and pending leave but not rejected leave or closure-booked leave", () => {
    const leaveEvents = events.filter((e) => e.category === "leave");
    expect(leaveEvents).toHaveLength(1);
    expect(leaveEvents[0]).toMatchObject({ title: "Thandi Nkosi: Annual Leave", tentative: true });
  });

  it("shows the closure span and its pay-out day", () => {
    expect(events.find((e) => e.category === "closure")).toMatchObject({
      title: "December shutdown (draft)",
      start: "2026-12-18",
      end: "2027-01-10",
    });
    expect(eventsOnDay(events, "2026-12-17").map((e) => e.title)).toContain("Shutdown pay-out: December shutdown");
    expect(eventsOnDay(events, "2026-12-24").some((e) => e.category === "closure")).toBe(true);
  });
});

describe("observed holidays", () => {
  it("flags the Monday after a Sunday holiday when it is not in the list", () => {
    const events = buildCalendarEvents({ holidays }, "2027-04-01", "2027-04-30");
    expect(events.filter((e) => e.category === "holiday").map((e) => [e.start, e.title])).toEqual([
      ["2027-04-27", "Freedom Day"],
    ]);

    const sunday = buildCalendarEvents(
      { holidays: [{ userId: "u", name: "Day of Goodwill", date: "2027-12-26", recurring: false }] },
      "2027-12-26",
      "2027-12-27"
    );
    expect(sunday.map((e) => [e.start, e.title, e.warning ?? false])).toEqual([
      ["2027-12-26", "Day of Goodwill", false],
      ["2027-12-27", "Day of Goodwill (observed)", true],
    ]);
  });
});

describe("helpers", () => {
  it("moves SARS due dates off weekends and holidays", () => {
    expect(sarsDueDate(new Date(2027, 1, 7), [])).toBe("2027-02-05");
    expect(sarsDueDate(new Date(2026, 9, 31), [])).toBe("2026-10-30");
  });

  it("steps monthly and bi-weekly cut-offs", () => {
    expect(payPeriodEnds({ payCycleType: "Monthly", cutOffDay: 25, payDayOffset: 0 }, "2026-11-01", "2027-01-31")).toEqual(
      expect.arrayContaining(["2026-11-25", "2026-12-25", "2027-01-25"])
    );
    const biWeekly = payPeriodEnds({ payCycleType: "Bi-Weekly", cutOffDay: 5, payDayOffset: 0 }, "2026-12-01", "2026-12-31");
    const inDec = biWeekly.filter((d) => d >= "2026-12-01");
    expect(inDec).toHaveLength(2);
  });
});
