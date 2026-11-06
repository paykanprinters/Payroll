"use client";

import React from "react";
import { Link } from "react-router-dom";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { AlertTriangle, CalendarRange, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import KanPageBanner from "@/components/KanPageBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { fetchClosures } from "@/integrations/supabase/closure-queries";
import { fetchPayrollRuns, type PayrollRun } from "@/integrations/supabase/payroll-run-queries";
import type { CompanyClosure } from "@/lib/company-closure";
import {
  buildCalendarEvents,
  CALENDAR_CATEGORIES,
  daysInRange,
  eventsOnDay,
  type CalendarCategory,
  type CalendarEvent,
} from "@/lib/payroll-calendar";

const CATEGORY_STYLES: Record<CalendarCategory, { dot: string; chip: string; cell?: string }> = {
  holiday: { dot: "bg-rose-500", chip: "bg-rose-100 text-rose-900 border-rose-200", cell: "bg-rose-50/70" },
  closure: { dot: "bg-amber-500", chip: "bg-amber-100 text-amber-900 border-amber-200", cell: "bg-amber-50/80" },
  payroll: { dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-900 border-emerald-200" },
  statutory: { dot: "bg-violet-500", chip: "bg-violet-100 text-violet-900 border-violet-200" },
  leave: { dot: "bg-sky-500", chip: "bg-sky-100 text-sky-900 border-sky-200" },
  people: { dot: "bg-pink-400", chip: "bg-pink-50 text-pink-900 border-pink-200" },
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS = 3;
const iso = (d: Date) => format(d, "yyyy-MM-dd");

const EventChip: React.FC<{ event: CalendarEvent; compact?: boolean }> = ({ event, compact }) => (
  <div
    title={event.detail ? `${event.title}\n${event.detail}` : event.title}
    className={cn(
      "flex items-center gap-1 truncate rounded border px-1.5 py-0.5 text-[11px] leading-tight",
      CATEGORY_STYLES[event.category].chip,
      event.tentative && "border-dashed opacity-80",
      compact && "px-1"
    )}
  >
    {event.warning && <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />}
    <span className="truncate">{event.title}</span>
  </div>
);

const EventRow: React.FC<{ event: CalendarEvent; showDate?: boolean }> = ({ event, showDate }) => {
  const range =
    event.start === event.end
      ? format(parseISO(event.start), "EEE d MMM")
      : `${format(parseISO(event.start), "d MMM")} – ${format(parseISO(event.end), "d MMM yyyy")}`;
  const body = (
    <div className="flex gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
      <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", CATEGORY_STYLES[event.category].dot)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          {event.warning && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />}
          <span>{event.title}</span>
        </div>
        {(showDate || event.start !== event.end) && <p className="text-xs text-muted-foreground">{range}</p>}
        {event.detail && <p className="mt-0.5 text-xs text-muted-foreground">{event.detail}</p>}
      </div>
    </div>
  );
  return event.href ? <Link to={event.href}>{body}</Link> : body;
};

const CalendarPage: React.FC = () => {
  const isMobile = useIsMobile();
  const {
    employees,
    leaveRecords,
    publicHolidays,
    payCycleSettings,
    isLoadingEmployees,
    isLoadingLeaveRecords,
  } = usePayrollProcessor();

  const today = iso(new Date());
  const [month, setMonth] = React.useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = React.useState(today);
  const [view, setView] = React.useState<"month" | "agenda">(isMobile ? "agenda" : "month");
  const [hidden, setHidden] = React.useState<Set<CalendarCategory>>(new Set());
  const [closures, setClosures] = React.useState<CompanyClosure[]>([]);
  const [runs, setRuns] = React.useState<PayrollRun[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchClosures().catch(() => []), fetchPayrollRuns().catch(() => [])]).then(([c, r]) => {
      if (cancelled) return;
      setClosures(c);
      setRuns(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const gridStart = startOfWeek(month, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const from = iso(gridStart);
  const upcomingEnd = iso(addDays(new Date(), 30));
  const to = [iso(gridEnd), upcomingEnd].sort()[1];

  const allEvents = React.useMemo(
    () =>
      buildCalendarEvents(
        {
          holidays: publicHolidays || [],
          leaveRecords,
          employees,
          closures,
          runs,
          payCycle: payCycleSettings,
        },
        [from, today].sort()[0],
        to,
        today
      ),
    [publicHolidays, leaveRecords, employees, closures, runs, payCycleSettings, from, to, today]
  );

  const events = React.useMemo(() => allEvents.filter((e) => !hidden.has(e.category)), [allEvents, hidden]);
  const counts = React.useMemo(() => {
    const monthFrom = iso(startOfMonth(month));
    const monthTo = iso(endOfMonth(month));
    const map = new Map<CalendarCategory, number>();
    for (const e of allEvents) {
      if (e.start <= monthTo && e.end >= monthFrom) map.set(e.category, (map.get(e.category) ?? 0) + 1);
    }
    return map;
  }, [allEvents, month]);

  const toggle = (id: CalendarCategory) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const goToday = () => {
    setMonth(startOfMonth(new Date()));
    setSelectedDay(today);
  };

  const monthDays = daysInRange(from, iso(gridEnd));
  const selectedEvents = eventsOnDay(events, selectedDay);
  const upcoming = events.filter((e) => e.end >= today && e.start <= upcomingEnd);
  const monthEvents = events.filter(
    (e) => e.start <= iso(endOfMonth(month)) && e.end >= iso(startOfMonth(month))
  );
  const isLoading = isLoadingEmployees || isLoadingLeaveRecords;

  return (
    <div className="flex flex-col gap-4">
      <KanPageBanner
        icon={CalendarRange}
        title="Calendar"
        description="Public holidays, business closures, pay days, SARS deadlines, leave and staff milestones in one place."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonth((m) => subMonths(m, 1))}
              aria-label="Previous month"
              className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToday}
              className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              aria-label="Next month"
              className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <Card className="rounded-xl border">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">{format(month, "MMMM yyyy")}</h2>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {CALENDAR_CATEGORIES.map((c) => {
              const off = hidden.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  aria-pressed={!off}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-opacity",
                    off ? "opacity-40" : "bg-background"
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", CATEGORY_STYLES[c.id].dot)} />
                  {c.label}
                  <span className="text-muted-foreground">{counts.get(c.id) ?? 0}</span>
                </button>
              );
            })}
            <Tabs value={view} onValueChange={(v) => setView(v as "month" | "agenda")}>
              <TabsList className="h-8">
                <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
                <TabsTrigger value="agenda" className="text-xs">List</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        {view === "month" ? (
          <Card className="overflow-hidden rounded-xl border">
            <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthDays.map((day) => {
                const dayEvents = eventsOnDay(events, day);
                const inMonth = isSameMonth(parseISO(day), month);
                const isSelected = day === selectedDay;
                const shade = dayEvents.find((e) => e.category === "holiday") ?? dayEvents.find((e) => e.category === "closure");
                const chips = dayEvents.filter(
                  (e) => e.category !== "closure" || e.start === day || parseISO(day).getDay() === 1
                );
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "flex min-h-[112px] flex-col gap-1 border-b border-r p-1.5 text-left align-top transition-colors hover:bg-muted/40",
                      shade && CATEGORY_STYLES[shade.category].cell,
                      !inMonth && "bg-muted/20 text-muted-foreground",
                      isSelected && "ring-2 ring-inset ring-cyan-600"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                        day === today && "bg-cyan-700 text-white"
                      )}
                    >
                      {format(parseISO(day), "d")}
                    </span>
                    {chips.slice(0, MAX_CHIPS).map((e) => (
                      <EventChip key={e.id} event={e} compact />
                    ))}
                    {chips.length > MAX_CHIPS && (
                      <span className="px-1 text-[11px] text-muted-foreground">+{chips.length - MAX_CHIPS} more</span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card className="rounded-xl border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{format(month, "MMMM yyyy")}</CardTitle>
              <CardDescription>{monthEvents.length} item(s) this month</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {monthEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing scheduled this month.</p>
              ) : (
                monthEvents.map((e) => <EventRow key={e.id} event={e} showDate />)
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-4">
          <Card className="rounded-xl border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{format(parseISO(selectedDay), "EEEE d MMMM yyyy")}</CardTitle>
              <CardDescription>
                {selectedEvents.length === 0 ? "Nothing on this day." : `${selectedEvents.length} item(s)`}
              </CardDescription>
            </CardHeader>
            {selectedEvents.length > 0 && (
              <CardContent className="flex flex-col gap-2">
                {selectedEvents.map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </CardContent>
            )}
          </Card>

          <Card className="rounded-xl border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Coming up</CardTitle>
              <CardDescription>The next 30 days</CardDescription>
            </CardHeader>
            <CardContent className="flex max-h-[520px] flex-col gap-2 overflow-y-auto">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing in the next 30 days.</p>
              ) : (
                upcoming.map((e) => <EventRow key={e.id} event={e} showDate />)
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
