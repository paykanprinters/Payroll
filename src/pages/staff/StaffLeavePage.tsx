"use client";

import React, { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import { useStaffPortalContext } from "@/context/StaffPortalContext";
import { calculateLeaveSummary } from "@/lib/leave-summary";
import { format, startOfYear, endOfYear } from "date-fns";

const StaffLeavePage: React.FC = () => {
  const { employee } = useStaffPortalContext();
  const { leaveRecords } = usePayrollProcessor();

  const myLeave = useMemo(
    () =>
      [...leaveRecords.filter((r) => r.employeeId === employee.id)].sort((a, b) =>
        b.startDate.localeCompare(a.startDate)
      ),
    [employee.id, leaveRecords]
  );

  const leaveSummary = useMemo(() => {
    const now = new Date();
    return calculateLeaveSummary(
      employee,
      leaveRecords,
      startOfYear(now),
      endOfYear(now),
      0
    );
  }, [employee, leaveRecords]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">My leave</h2>
        <p className="text-sm text-muted-foreground">
          Leave balances and recorded absences for your employee profile.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-cyan-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Annual leave remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-cyan-800">{Math.max(0, leaveSummary.annual)} days</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Sick leave remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-800">{Math.max(0, leaveSummary.sick)} days</p>
          </CardContent>
        </Card>
        <Card className="border-amber-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Unpaid leave (period)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-800">{leaveSummary.unpaid} days</p>
          </CardContent>
        </Card>
      </div>

      {myLeave.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground" />
            <p className="mt-4 font-medium">No leave records</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Approved leave will appear here once recorded by payroll.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Leave history</CardTitle>
            <CardDescription>Recorded absences on your profile</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Working days</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myLeave.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="outline">{entry.leaveType}</Badge>
                    </TableCell>
                    <TableCell>{format(new Date(entry.startDate), "dd MMM yyyy")}</TableCell>
                    <TableCell>{format(new Date(entry.endDate), "dd MMM yyyy")}</TableCell>
                    <TableCell>{entry.workingDays}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {entry.reason || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Leave balances shown here use the same calculation as payslips. Contact payroll to request leave or
          correct a record.
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffLeavePage;
