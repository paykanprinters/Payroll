import {
  addDays,
  differenceInCalendarYears,
  eachDayOfInterval,
  format,
  getDay,
  isWeekend,
  lastDayOfMonth,
  parseISO,
  setYear,
  subDays,
} from "date-fns";
import type { LeaveEntry, MockEmployee } from "@/lib/mock-data-interfaces";
import type { PublicHoliday } from "@/hooks/use-public-holidays";
import type { CompanyClosure } from "@/lib/company-closure";
import type { PayrollRun } from "@/integrations/supabase/payroll-run-queries";
import { calculatePayPeriodDetails } from "@/lib/payroll-calculations";
import { normalizeLeaveStatus } from "@/lib/leave-status";

export type CalendarCategory = "holiday" | "closure" | "payroll" | "statutory" | "leave" | "people";

export const CALENDAR_CATEGORIES: { id: CalendarCategory; label: string }[] = [
  { id: "holiday", label: "Public holidays" },
  { id: "closure", label: "Business closures" },
  { id: "payroll", label: "Pay days & runs" },
  { id: "statutory", label: "SARS deadlines" },
  { id: "leave", label: "Leave" },
  { id: "people", label: "Birthdays & milestones" },
];

export type CalendarEvent = {
  id: string;
  category: CalendarCategory;
  title: string;
  detail?: string;
  /** yyyy-MM-dd, inclusive. */
  start: string;
  end: string;
  /** Pending leave, draft closures and projected pay days. */
  tentative?: boolean;
  /** Needs attention (e.g. a past pay day without a payroll run). */
  warning?: boolean;
  href?: string;
};

export type PayCycleInput = {
  payCycleType: "Monthly" | "Weekly" | "Bi-Weekly";
  cutOffDay: number;
  payDayOffset: number;
};

export type CalendarSources = {
  holidays?: PublicHoliday[];
  leaveRecords?: LeaveEntry[];
  employees?: MockEmployee[];
  closures?: CompanyClosure[];
  runs?: PayrollRun[];
  payCycle?: PayCycleInput | null;
};

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const overlaps = (start: string, end: string, from: string, to: string) => start <= to && end >= from;
const fullName = (e?: MockEmployee) => (e ? `${e.firstName} ${e.lastName}`.trim() : "Unknown employee");

function holidayDatesInRange(h: PublicHoliday, from: string, to: string): string[] {
  if (!h.recurring) return h.date >= from && h.date <= to ? [h.date] : [];
  const dates: string[] = [];
  const base = parseISO(h.date);
  for (let year = Number(from.slice(0, 4)); year <= Number(to.slice(0, 4)); year += 1) {
    const date = iso(setYear(base, year));
    if (date >= from && date <= to) dates.push(date);
  }
  return dates;
}

function holidayEvents(holidays: PublicHoliday[], from: string, to: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const h of holidays) {
    if (h.visibleInCalendar === false) continue;
    for (const date of holidayDatesInRange(h, from, to)) {
      const scope = h.departments?.length ? `Only for: ${h.departments.join(", ")}.` : undefined;
      events.push({
        id: `holiday-${h.id ?? h.name}-${date}`,
        category: "holiday",
        title: h.name,
        detail: scope,
        start: date,
        end: date,
        href: "/settings/work-hours",
      });
      if (getDay(parseISO(date)) === 0) {
        const monday = iso(addDays(parseISO(date), 1));
        const listed = holidays.some((o) => holidayDatesInRange(o, monday, monday).length > 0);
        if (!listed && monday >= from && monday <= to) {
          events.push({
            id: `holiday-observed-${h.id ?? h.name}-${monday}`,
            category: "holiday",
            title: `${h.name} (observed)`,
            detail:
              "The holiday falls on a Sunday, so by law the Monday is a public holiday. It is not in the holiday list yet, so payroll will not pay it as a holiday until it is added.",
            start: monday,
            end: monday,
            warning: true,
            href: "/settings/work-hours",
          });
        }
      }
    }
  }
  return events;
}

function isHoliday(date: string, holidays: PublicHoliday[]) {
  return holidays.some((h) => holidayDatesInRange(h, date, date).length > 0);
}

function leaveEvents(records: LeaveEntry[], employees: MockEmployee[], from: string, to: string): CalendarEvent[] {
  const byId = new Map(employees.map((e) => [e.id, e]));
  return records
    .filter((r) => !r.closureId && overlaps(r.startDate, r.endDate, from, to))
    .flatMap((r): CalendarEvent[] => {
      const status = normalizeLeaveStatus(r.status);
      if (status !== "Approved" && status !== "Pending") return [];
      const days = r.workingDays ? ` · ${r.workingDays} working day${r.workingDays === 1 ? "" : "s"}` : "";
      return [
        {
          id: `leave-${r.id}`,
          category: "leave",
          title: `${fullName(byId.get(r.employeeId))}: ${r.leaveType}`,
          detail: `${status === "Pending" ? "Awaiting approval" : "Approved"}${days}${r.reason ? ` · ${r.reason}` : ""}`,
          start: r.startDate,
          end: r.endDate,
          tentative: status === "Pending",
          href: "/vacation-absence",
        },
      ];
    });
}

function closureEvents(closures: CompanyClosure[], from: string, to: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const c of closures) {
    const draft = c.status !== "published";
    if (overlaps(c.startDate, c.endDate, from, to)) {
      events.push({
        id: `closure-${c.id}`,
        category: "closure",
        title: draft ? `${c.name} (draft)` : c.name,
        detail: draft
          ? "Business closed. Not published yet, so no leave has been booked."
          : "Business closed. Leave has been booked for staff.",
        start: c.startDate,
        end: c.endDate,
        tentative: draft,
        href: "/settings/company-closure",
      });
    }
    if (c.payoutDate && c.payoutDate >= from && c.payoutDate <= to) {
      events.push({
        id: `closure-payout-${c.id}`,
        category: "payroll",
        title: `Shutdown pay-out: ${c.name}`,
        detail: "Closing week and shutdown weeks are paid in advance on this day.",
        start: c.payoutDate,
        end: c.payoutDate,
        tentative: draft,
        href: "/settings/company-closure",
      });
    }
  }
  return events;
}

/** Pay period end dates (cut-offs) from the pay cycle settings, covering the range. */
export function payPeriodEnds(payCycle: PayCycleInput, from: string, to: string): string[] {
  const ends: string[] = [];
  let ref = subDays(parseISO(from), 40);
  for (let i = 0; i < 400; i += 1) {
    const { payPeriodEnd } = calculatePayPeriodDetails(ref, payCycle.payCycleType, payCycle.cutOffDay, payCycle.payDayOffset);
    const end = iso(payPeriodEnd);
    if (end > to) break;
    if (!ends.includes(end)) ends.push(end);
    ref = addDays(payPeriodEnd, payCycle.payCycleType === "Bi-Weekly" ? 8 : 1);
  }
  return ends;
}

function payrollEvents(
  payCycle: PayCycleInput | null | undefined,
  runs: PayrollRun[],
  holidays: PublicHoliday[],
  from: string,
  to: string,
  today: string
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const activeRuns = runs.filter((r) => r.status !== "Cancelled");
  const runByEnd = new Map(activeRuns.map((r) => [r.periodEnd, r]));
  const offset = payCycle?.payDayOffset ?? 0;
  const covered = new Set<string>();

  if (payCycle) {
    for (const end of payPeriodEnds(payCycle, iso(subDays(parseISO(from), offset)), to)) {
      const payDay = iso(addDays(parseISO(end), offset));
      const run = runByEnd.get(end);
      if (run) covered.add(run.id);
      if (offset > 0 && end >= from && end <= to) {
        events.push({
          id: `cutoff-${end}`,
          category: "payroll",
          title: "Pay week cut-off",
          detail: "Timesheets for the pay period close today.",
          start: end,
          end,
          href: "/timesheet",
        });
      }
      if (payDay < from || payDay > to) continue;
      const notes: string[] = [];
      if (isHoliday(payDay, holidays)) notes.push("Falls on a public holiday: pay on the working day before.");
      else if (isWeekend(parseISO(payDay))) notes.push("Falls on a weekend: pay on the working day before.");
      if (run) {
        events.push({
          id: `run-${run.id}`,
          category: "payroll",
          title: `Pay day · run ${run.status}`,
          detail: [`Pay period ${run.periodStart} to ${run.periodEnd}.`, ...notes].join(" "),
          start: payDay,
          end: payDay,
          href: `/payroll/runs/${run.id}`,
        });
      } else {
        const missed = payDay < today;
        events.push({
          id: `payday-${end}`,
          category: "payroll",
          title: missed ? "Pay day · no payroll run" : "Pay day",
          detail: [
            missed
              ? `No payroll run was created for the period ending ${end}.`
              : `Pay period ending ${end}. No payroll run yet.`,
            ...notes,
          ].join(" "),
          start: payDay,
          end: payDay,
          tentative: !missed,
          warning: missed || notes.length > 0,
          href: "/payroll/runs",
        });
      }
    }
  }

  for (const run of activeRuns) {
    if (covered.has(run.id)) continue;
    const payDay = iso(addDays(parseISO(run.periodEnd), offset));
    if (payDay < from || payDay > to) continue;
    events.push({
      id: `run-${run.id}`,
      category: "payroll",
      title: `Payroll run ${run.status}`,
      detail: `Pay period ${run.periodStart} to ${run.periodEnd}.`,
      start: payDay,
      end: payDay,
      href: `/payroll/runs/${run.id}`,
    });
  }
  return events;
}

/** SARS moves a due date on a weekend or public holiday to the last business day before it. */
export function sarsDueDate(date: Date, holidays: PublicHoliday[]): string {
  let d = date;
  for (let i = 0; i < 10 && (isWeekend(d) || isHoliday(iso(d), holidays)); i += 1) d = subDays(d, 1);
  return iso(d);
}

function statutoryEvents(holidays: PublicHoliday[], from: string, to: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const start = parseISO(from);
  const end = parseISO(to);
  for (let y = start.getFullYear(); y <= end.getFullYear(); y += 1) {
    for (let m = 0; m < 12; m += 1) {
      const due = sarsDueDate(new Date(y, m, 7), holidays);
      if (due >= from && due <= to) {
        const period = format(new Date(y, m - 1, 1), "MMMM yyyy");
        events.push({
          id: `emp201-${y}-${m}`,
          category: "statutory",
          title: "EMP201 due",
          detail: `Submit and pay PAYE, UIF and SDL for ${period} to SARS.`,
          start: due,
          end: due,
          href: "/reports",
        });
      }
    }
    const recons = [
      { id: "interim", date: new Date(y, 9, 31), title: "EMP501 interim reconciliation due", detail: `Covers March to August ${y}.` },
      {
        id: "annual",
        date: lastDayOfMonth(new Date(y, 4, 1)),
        title: "EMP501 annual reconciliation due",
        detail: `Covers March ${y - 1} to February ${y}. IRP5 certificates go to staff with it.`,
      },
    ];
    for (const r of recons) {
      const due = sarsDueDate(r.date, holidays);
      if (due >= from && due <= to) {
        events.push({ id: `emp501-${r.id}-${y}`, category: "statutory", title: r.title, detail: r.detail, start: due, end: due, href: "/reports" });
      }
    }
  }
  return events;
}

function peopleEvents(employees: MockEmployee[], from: string, to: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const years = Array.from(
    { length: Number(to.slice(0, 4)) - Number(from.slice(0, 4)) + 1 },
    (_, i) => Number(from.slice(0, 4)) + i
  );
  for (const e of employees) {
    const name = fullName(e);
    const left = e.terminationDate?.slice(0, 10);
    if (e.startDate) {
      const startDate = e.startDate.slice(0, 10);
      if (startDate >= from && startDate <= to) {
        events.push({ id: `start-${e.id}`, category: "people", title: `${name}: first day`, start: startDate, end: startDate, href: "/employees" });
      }
      for (const y of years) {
        const date = iso(setYear(parseISO(startDate), y));
        const service = differenceInCalendarYears(parseISO(date), parseISO(startDate));
        if (service > 0 && service % 5 === 0 && date >= from && date <= to && (!left || date <= left)) {
          events.push({ id: `service-${e.id}-${y}`, category: "people", title: `${name}: ${service} years of service`, start: date, end: date, href: "/employees" });
        }
      }
    }
    if (left && left >= from && left <= to) {
      events.push({ id: `left-${e.id}`, category: "people", title: `${name}: last day`, start: left, end: left, warning: true, href: "/employees" });
    }
    if (e.dateOfBirth) {
      for (const y of years) {
        const date = iso(setYear(parseISO(e.dateOfBirth.slice(0, 10)), y));
        if (date >= from && date <= to && (!left || date <= left)) {
          events.push({ id: `birthday-${e.id}-${y}`, category: "people", title: `${name}: birthday`, start: date, end: date });
        }
      }
    }
  }
  return events;
}

const CATEGORY_ORDER: CalendarCategory[] = ["closure", "holiday", "payroll", "statutory", "leave", "people"];

/** Every dated item admins care about, for the range `from`–`to` (yyyy-MM-dd, inclusive). */
export function buildCalendarEvents(
  sources: CalendarSources,
  from: string,
  to: string,
  today: string = iso(new Date())
): CalendarEvent[] {
  const holidays = sources.holidays ?? [];
  const employees = sources.employees ?? [];
  return [
    ...holidayEvents(holidays, from, to),
    ...closureEvents(sources.closures ?? [], from, to),
    ...payrollEvents(sources.payCycle, sources.runs ?? [], holidays, from, to, today),
    ...statutoryEvents(holidays, from, to),
    ...leaveEvents(sources.leaveRecords ?? [], employees, from, to),
    ...peopleEvents(employees, from, to),
  ].sort(
    (a, b) =>
      a.start.localeCompare(b.start) ||
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      a.title.localeCompare(b.title)
  );
}

export function eventsOnDay(events: CalendarEvent[], date: string): CalendarEvent[] {
  return events.filter((e) => e.start <= date && e.end >= date);
}

export function daysInRange(from: string, to: string): string[] {
  return eachDayOfInterval({ start: parseISO(from), end: parseISO(to) }).map(iso);
}
