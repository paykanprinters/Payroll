"use client";

import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { usePublicHolidays } from "@/hooks/use-public-holidays";
import { format, parseISO } from "date-fns";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import { AlertTriangle, ClockAlert, Flag, PartyPopper } from "lucide-react";

type ExceptionRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  workedHours: number;
  overtimeHours: number;
  issues: string[];
};

const issueBadgeClass = (issue: string) => {
  const key = issue.toLowerCase();
  if (key.includes("holiday")) return "bg-sky-50 text-sky-700 border-sky-200";
  if (key.includes("overtime")) return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (key.includes("absent")) return "bg-rose-50 text-rose-700 border-rose-200";
  if (key.includes("late") || key.includes("early")) return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-muted text-foreground border-border";
};

const ExceptionsDashboardPage: React.FC = () => {
  const { timesheets, workHoursSettings, isMockDataEnabled, employees } = usePayrollProcessor({ silent: true });
  const { publicHolidays } = usePublicHolidays({ isMockDataEnabled, isAuthenticated: true, isLoadingAuth: false } as any);

  const employeesById = useMemo(() => {
    const map = new Map<string, string>();
    (employees || []).forEach((e) => map.set(e.id, `${e.firstName} ${e.lastName}`.trim()));
    return map;
  }, [employees]);

  const workDays = (workHoursSettings?.workDays || []).map((d) => d.toLowerCase());

  const exceptions = useMemo<ExceptionRow[]>(() => {
    return (timesheets || []).flatMap((ts) => {
      const issues: string[] = [];
      const date = parseISO(ts.date);
      const dow = date.getDay();
      const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][dow];

      const workedHours = ts.totalWorkHours || 0;
      const overtimeHours = ts.overtimeHours || 0;

      // Non-working weekend work
      if (
        (dow === 6 && !workDays.includes("saturday") && workedHours > 0) ||
        (dow === 0 && !workDays.includes("sunday") && workedHours > 0)
      ) {
        issues.push("Work on non-working weekend day");
      }

      // Late/Early/Absent flags
      if (ts.lateArrival) issues.push("Late arrival");
      if (ts.earlyDeparture) issues.push("Early departure");
      if (ts.absent) issues.push("Marked absent");

      // Overtime spikes
      if (overtimeHours > 0) issues.push(`Overtime recorded (${overtimeHours.toFixed(2)}h)`);

      // Holiday check
      const isHoliday = publicHolidays?.some((h) => {
        if (h.recurring) {
          const hd = parseISO(h.date);
          return hd.getMonth() === date.getMonth() && hd.getDate() === date.getDate();
        }
        return h.date === ts.date;
      });
      if (isHoliday) issues.push("Work on public holiday");

      return issues.length > 0
        ? [
            {
              id: ts.id,
              employeeId: ts.employeeId,
              employeeName: employeesById.get(ts.employeeId) || ts.employeeId,
              date: ts.date,
              workedHours,
              overtimeHours,
              issues,
            },
          ]
        : [];
    });
  }, [timesheets, workDays, publicHolidays, employeesById]);

  const totals = useMemo(() => {
    const total = exceptions.length;
    const overtime = exceptions.filter((e) => e.issues.some((i) => i.toLowerCase().includes("overtime"))).length;
    const holiday = exceptions.filter((e) => e.issues.some((i) => i.toLowerCase().includes("holiday"))).length;
    const attendance = exceptions.filter((e) =>
      e.issues.some((i) => i.toLowerCase().includes("late") || i.toLowerCase().includes("early") || i.toLowerCase().includes("absent"))
    ).length;
    return { total, overtime, holiday, attendance };
  }, [exceptions]);

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
        <SummaryAccent variant="orange" />
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl -tracking-tight">Exceptions Dashboard</CardTitle>
            <div className="text-sm text-muted-foreground">
              Review timesheet anomalies before payroll approvals.
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            <span>{totals.total} exception row(s)</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {exceptions.map((ex) => (
                  <TableRow key={ex.id}>
                    <TableCell className="font-mono text-xs">{format(parseISO(ex.date), "yyyy-MM-dd")}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{ex.employeeName}</div>
                      <div className="font-mono text-xs text-muted-foreground">{ex.employeeId}</div>
                    </TableCell>
                    <TableCell className="text-right">{ex.workedHours.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{ex.overtimeHours.toFixed(2)}</TableCell>
                    <TableCell className="space-x-1">
                      {ex.issues.map((i, idx) => (
                        <Badge key={idx} variant="outline" className={issueBadgeClass(i)}>
                          {i}
                        </Badge>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
                {exceptions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No exceptions found for current data.
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