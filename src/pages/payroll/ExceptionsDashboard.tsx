"use client";

import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { usePublicHolidays } from "@/hooks/use-public-holidays";
import { format, parseISO } from "date-fns";

const ExceptionsDashboardPage: React.FC = () => {
  const { timesheets, workHoursSettings, isMockDataEnabled } = usePayrollProcessor({ silent: true });
  const { publicHolidays } = usePublicHolidays({ isMockDataEnabled, isAuthenticated: true, isLoadingAuth: false } as any);

  const workDays = (workHoursSettings?.workDays || []).map(d => d.toLowerCase());
  const exceptions = useMemo(() => {
    return timesheets.flatMap(ts => {
      const issues: string[] = [];
      const date = parseISO(ts.date);
      const dow = date.getDay();
      const dayName = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][dow];

      const workedHours = ts.totalWorkHours || 0;
      const overtimeHours = ts.overtimeHours || 0;

      // Non-working weekend work
      if ((dow === 6 && !workDays.includes("saturday") && workedHours > 0) ||
          (dow === 0 && !workDays.includes("sunday") && workedHours > 0)) {
        issues.push("Work on non-working weekend day");
      }

      // Late/Early/Absent flags
      if (ts.lateArrival) issues.push("Late arrival");
      if (ts.earlyDeparture) issues.push("Early departure");
      if (ts.absent) issues.push("Marked absent");

      // Overtime spikes
      if (overtimeHours > 0) issues.push(`Overtime recorded (${overtimeHours.toFixed(2)}h)`);

      // Holiday check
      const isHoliday = publicHolidays?.some(h => {
        if (h.recurring) {
          const hd = parseISO(h.date);
          return hd.getMonth() === date.getMonth() && hd.getDate() === date.getDate();
        }
        return h.date === ts.date;
      });
      if (isHoliday) issues.push("Work on public holiday");

      return issues.length > 0 ? [{
        id: ts.id,
        employeeId: ts.employeeId,
        date: ts.date,
        workedHours,
        overtimeHours,
        issues
      }] : [];
    });
  }, [timesheets, workDays, publicHolidays]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Exceptions Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Worked Hours</TableHead>
                <TableHead>Overtime</TableHead>
                <TableHead>Issues</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exceptions.map(ex => (
                <TableRow key={ex.id}>
                  <TableCell className="font-mono text-xs">{format(parseISO(ex.date), "yyyy-MM-dd")}</TableCell>
                  <TableCell className="font-mono text-xs">{ex.employeeId}</TableCell>
                  <TableCell>{ex.workedHours.toFixed(2)}</TableCell>
                  <TableCell>{ex.overtimeHours.toFixed(2)}</TableCell>
                  <TableCell className="space-x-1">
                    {ex.issues.map((i, idx) => (
                      <Badge key={idx} variant="outline">{i}</Badge>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default ExceptionsDashboardPage;