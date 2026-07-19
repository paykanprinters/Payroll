"use client";

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import { usePublicHolidays } from "@/hooks/use-public-holidays";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import { AlertTriangle, ClockAlert, Download, ExternalLink, Flag, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/native-blob-download";
import { escapeCsvField } from "@/lib/report-generators/easyfile-export";
import { useToast } from "@/components/ui/use-toast";

export type ExceptionIssueCode = "absent" | "late" | "early" | "overtime" | "holiday" | "weekend";

type ExceptionIssue = {
  code: ExceptionIssueCode;
  label: string;
};

type ExceptionRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  workedHours: number;
  overtimeHours: number;
  issues: ExceptionIssue[];
  severityRank: number;
};

const ISSUE_SEVERITY: Record<ExceptionIssueCode, number> = {
  absent: 100,
  late: 80,
  early: 75,
  holiday: 60,
  weekend: 55,
  overtime: 40,
};

const CHIP_FILTERS: Array<{ code: ExceptionIssueCode; label: string }> = [
  { code: "absent", label: "Absent" },
  { code: "late", label: "Late" },
  { code: "overtime", label: "OT" },
  { code: "holiday", label: "Holiday" },
  { code: "weekend", label: "Weekend" },
];

const issueBadgeClass = (code: ExceptionIssueCode) => {
  if (code === "holiday") return "bg-sky-50 text-sky-700 border-sky-200";
  if (code === "overtime") return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (code === "absent") return "bg-rose-50 text-rose-700 border-rose-200";
  if (code === "late" || code === "early") return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-muted text-foreground border-border";
};

function maxSeverity(issues: ExceptionIssue[]): number {
  return issues.reduce((max, issue) => Math.max(max, ISSUE_SEVERITY[issue.code] || 0), 0);
}

function timesheetDeepLink(employeeId: string, date: string): string {
  return `/timesheet?employeeId=${encodeURIComponent(employeeId)}&dateStart=${encodeURIComponent(
    date
  )}&dateEnd=${encodeURIComponent(date)}`;
}

const ExceptionsDashboardPage: React.FC = () => {
  const { timesheets, workHoursSettings, isMockDataEnabled, employees } = usePayrollProcessor();
  const { publicHolidays } = usePublicHolidays({ isMockDataEnabled, isAuthenticated: true, isLoadingAuth: false });
  const { toast } = useToast();

  const [periodMonth, setPeriodMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [activeChips, setActiveChips] = useState<ExceptionIssueCode[]>([]);

  const employeesById = useMemo(() => {
    const map = new Map<string, string>();
    (employees || []).forEach((e) => map.set(e.id, `${e.firstName} ${e.lastName}`.trim()));
    return map;
  }, [employees]);

  const workDays = (workHoursSettings?.workDays || []).map((d) => d.toLowerCase());

  const periodBounds = useMemo(() => {
    const anchor = parseISO(`${periodMonth}-01`);
    return {
      start: startOfMonth(anchor),
      end: endOfMonth(anchor),
      label: format(anchor, "MMMM yyyy"),
    };
  }, [periodMonth]);

  const exceptions = useMemo<ExceptionRow[]>(() => {
    const startIso = format(periodBounds.start, "yyyy-MM-dd");
    const endIso = format(periodBounds.end, "yyyy-MM-dd");

    return (timesheets || [])
      .filter((ts) => ts.date >= startIso && ts.date <= endIso)
      .flatMap((ts) => {
        const issues: ExceptionIssue[] = [];
        const date = parseISO(ts.date);
        const dow = date.getDay();

        const workedHours = ts.totalWorkHours || 0;
        const overtimeHours = ts.overtimeHours || 0;

        if (
          (dow === 6 && !workDays.includes("saturday") && workedHours > 0) ||
          (dow === 0 && !workDays.includes("sunday") && workedHours > 0)
        ) {
          issues.push({ code: "weekend", label: "Work on non-working weekend day" });
        }

        if (ts.lateArrival) issues.push({ code: "late", label: "Late arrival" });
        if (ts.earlyDeparture) issues.push({ code: "early", label: "Early departure" });
        if (ts.absent) issues.push({ code: "absent", label: "Marked absent" });

        if (overtimeHours > 0) {
          issues.push({ code: "overtime", label: `Overtime recorded (${overtimeHours.toFixed(2)}h)` });
        }

        const isHoliday = publicHolidays?.some((h) => {
          if (h.recurring) {
            const hd = parseISO(h.date);
            return hd.getMonth() === date.getMonth() && hd.getDate() === date.getDate();
          }
          return h.date === ts.date;
        });
        if (isHoliday && workedHours > 0) {
          issues.push({ code: "holiday", label: "Work on public holiday" });
        }

        if (issues.length === 0) return [];

        return [
          {
            id: ts.id,
            employeeId: ts.employeeId,
            employeeName: employeesById.get(ts.employeeId) || ts.employeeId,
            date: ts.date,
            workedHours,
            overtimeHours,
            issues,
            severityRank: maxSeverity(issues),
          },
        ];
      })
      .sort((a, b) => b.severityRank - a.severityRank || b.date.localeCompare(a.date));
  }, [timesheets, workDays, publicHolidays, employeesById, periodBounds]);

  const filteredExceptions = useMemo(() => {
    if (activeChips.length === 0) return exceptions;
    return exceptions.filter((row) =>
      row.issues.some((issue) => {
        if (activeChips.includes(issue.code)) return true;
        // "Late" chip also covers early departure for ops triage
        if (activeChips.includes("late") && issue.code === "early") return true;
        return false;
      })
    );
  }, [exceptions, activeChips]);

  const totals = useMemo(() => {
    const total = filteredExceptions.length;
    const overtime = filteredExceptions.filter((e) => e.issues.some((i) => i.code === "overtime")).length;
    const holiday = filteredExceptions.filter((e) => e.issues.some((i) => i.code === "holiday")).length;
    const attendance = filteredExceptions.filter((e) =>
      e.issues.some((i) => i.code === "late" || i.code === "early" || i.code === "absent")
    ).length;
    return { total, overtime, holiday, attendance };
  }, [filteredExceptions]);

  const toggleChip = (code: ExceptionIssueCode) => {
    setActiveChips((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };

  const exportCsv = async () => {
    const header = ["Date", "Employee ID", "Employee", "Worked Hours", "Overtime Hours", "Issues", "Timesheet Link"];
    const lines = filteredExceptions.map((row) =>
      [
        row.date,
        row.employeeId,
        row.employeeName,
        row.workedHours.toFixed(2),
        row.overtimeHours.toFixed(2),
        row.issues.map((i) => i.label).join("; "),
        timesheetDeepLink(row.employeeId, row.date),
      ]
        .map((value) => escapeCsvField(String(value)))
        .join(",")
    );
    const csv = `\uFEFF${[header.map(escapeCsvField).join(","), ...lines].join("\r\n")}`;
    await downloadBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      `exceptions-${periodMonth}.csv`,
      "text/csv"
    );
    toast({ title: "CSV exported", description: `${filteredExceptions.length} row(s) for ${periodBounds.label}.` });
  };

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
        <SummaryAccent variant="orange" />
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl -tracking-tight">Exceptions Dashboard</CardTitle>
            <div className="text-sm text-muted-foreground">
              Review timesheet anomalies for {periodBounds.label} before payroll approvals.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="space-y-1">
              <Label htmlFor="exceptions-period" className="text-xs text-muted-foreground">
                Payroll month
              </Label>
              <Input
                id="exceptions-period"
                type="month"
                value={periodMonth}
                onChange={(e) => setPeriodMonth(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <Button type="button" variant="outline" className="mt-5" onClick={exportCsv} disabled={filteredExceptions.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {CHIP_FILTERS.map((chip) => {
              const active = activeChips.includes(chip.code);
              return (
                <Button
                  key={chip.code}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  className={cn("rounded-full", active && "shadow-sm")}
                  onClick={() => toggleChip(chip.code)}
                  aria-pressed={active}
                >
                  {chip.label}
                </Button>
              );
            })}
            {activeChips.length > 0 && (
              <Button type="button" size="sm" variant="ghost" onClick={() => setActiveChips([])}>
                Clear filters
              </Button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border bg-background p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-4 w-4" /> Total
              </div>
              <div className="mt-1 text-xl font-semibold">{totals.total}</div>
            </div>
            <div className="rounded-2xl border bg-background p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ClockAlert className="h-4 w-4" /> Overtime
              </div>
              <div className="mt-1 text-xl font-semibold">{totals.overtime}</div>
            </div>
            <div className="rounded-2xl border bg-background p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <PartyPopper className="h-4 w-4" /> Holidays
              </div>
              <div className="mt-1 text-xl font-semibold">{totals.holiday}</div>
            </div>
            <div className="rounded-2xl border bg-background p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Flag className="h-4 w-4" /> Attendance
              </div>
              <div className="mt-1 text-xl font-semibold">{totals.attendance}</div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Worked Hours</TableHead>
                  <TableHead className="text-right">Overtime</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExceptions.map((ex) => (
                  <TableRow key={ex.id}>
                    <TableCell className="font-mono text-xs">{format(parseISO(ex.date), "yyyy-MM-dd")}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{ex.employeeName}</div>
                      <div className="font-mono text-xs text-muted-foreground">{ex.employeeId}</div>
                    </TableCell>
                    <TableCell className="text-right">{ex.workedHours.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{ex.overtimeHours.toFixed(2)}</TableCell>
                    <TableCell className="space-x-1">
                      {ex.issues.map((issue, idx) => (
                        <Badge key={`${issue.code}-${idx}`} variant="outline" className={issueBadgeClass(issue.code)}>
                          {issue.label}
                        </Badge>
                      ))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link to={timesheetDeepLink(ex.employeeId, ex.date)} title="Open timesheet day">
                          <ExternalLink className="h-4 w-4" />
                          <span className="sr-only">Open timesheet</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredExceptions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No exceptions found for {periodBounds.label}
                      {activeChips.length > 0 ? " with the selected filters" : ""}.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExceptionsDashboardPage;
