"use client";

import React, { useMemo, useState } from "react";
import { CalendarDays, PlusCircle, FileText, Ban } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import { useStaffPortalContext } from "@/context/StaffPortalContext";
import { LeaveEntry } from "@/lib/mock-data-interfaces";
import { computeEmployeeLeaveBalance } from "@/lib/leave-accrual";
import { format, parseISO } from "date-fns";
import LeaveStatusBadge from "@/components/vacation-absence/LeaveStatusBadge";
import LeaveRecordDialog from "@/components/vacation-absence/LeaveRecordDialog";
import { canStaffCancelLeave } from "@/lib/leave-status";

const StaffLeavePage: React.FC = () => {
  const { employee } = useStaffPortalContext();
  const { leaveRecords, addLeaveRecord, cancelLeaveRequest } = usePayrollProcessor();
  const [requestOpen, setRequestOpen] = useState(false);

  const myLeave = useMemo(
    () =>
      [...leaveRecords.filter((r) => r.employeeId === employee.id)].sort((a, b) =>
        b.startDate.localeCompare(a.startDate)
      ),
    [employee.id, leaveRecords]
  );

  const leaveBalance = useMemo(
    () => computeEmployeeLeaveBalance(employee, leaveRecords, new Date()),
    [employee, leaveRecords]
  );

  const pendingCount = myLeave.filter((r) => r.status === "Pending").length;

  const handleSubmitRequest = async (payload: Omit<LeaveEntry, "id">) => {
    await addLeaveRecord(
      {
        ...payload,
        employeeId: employee.id,
      },
      { asStaffRequest: true }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">My leave</h2>
          <p className="text-sm text-muted-foreground">
            Submit annual or sick leave for approval. Once submitted, requests are read-only until
            payroll reviews them.
          </p>
        </div>
        <Button onClick={() => setRequestOpen(true)} className="rounded-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          Request leave
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="border-cyan-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Annual leave remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-cyan-800">{leaveBalance.annual.remaining} days</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {leaveBalance.annual.taken} of {leaveBalance.annual.entitled} accrued this cycle
            </p>
          </CardContent>
        </Card>
        <Card className="border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Sick leave remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-800">{leaveBalance.sick.remaining} days</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {leaveBalance.sick.inQualifyingPeriod ? "Qualifying period accrual" : "36-month cycle"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-violet-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pending requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-violet-800">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="border-rose-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Family responsibility</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-rose-800">
              {leaveBalance.familyResponsibility.remaining} days
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Leave cycle ends</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-800">
              {format(parseISO(leaveBalance.annual.cycleEnd), "dd MMM yyyy")}
            </p>
          </CardContent>
        </Card>
      </div>

      {myLeave.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground" />
            <p className="mt-4 font-medium">No leave requests yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Submit annual or sick leave with optional supporting documents.
            </p>
            <Button className="mt-4 rounded-full" onClick={() => setRequestOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Request leave
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>My leave requests</CardTitle>
            <CardDescription>View status and documents — editing is locked after submission</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Working days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myLeave.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <LeaveStatusBadge status={entry.status} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.leaveType}</Badge>
                    </TableCell>
                    <TableCell>{format(new Date(entry.startDate), "dd MMM yyyy")}</TableCell>
                    <TableCell>{format(new Date(entry.endDate), "dd MMM yyyy")}</TableCell>
                    <TableCell>{entry.workingDays}</TableCell>
                    <TableCell className="max-w-[180px]">
                      <p className="truncate">{entry.reason || "—"}</p>
                      {entry.rejectionReason && (
                        <p className="mt-1 truncate text-xs text-destructive">{entry.rejectionReason}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.documentUrl ? (
                        <a
                          href={entry.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          View
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canStaffCancelLeave(entry) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() => void cancelLeaveRequest(entry.id)}
                        >
                          <Ban className="mr-1 h-4 w-4" />
                          Withdraw
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Locked</span>
                      )}
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
          <p className="font-medium text-foreground">How leave approval works</p>
          <p className="mt-2">
            <strong>Pending</strong> — submitted and awaiting payroll review.{" "}
            <strong>Approved</strong> — booked and reflected in your balance.{" "}
            <strong>Rejected</strong> — not applied; see the note from payroll. You may{" "}
            <strong>withdraw</strong> a pending request only. Attach a doctor&apos;s note or letter
            for sick leave when possible.
          </p>
        </CardContent>
      </Card>

      <LeaveRecordDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        employees={[]}
        mode="staff-submit"
        employeeId={employee.id}
        onSubmit={handleSubmitRequest}
      />
    </div>
  );
};

export default StaffLeavePage;
