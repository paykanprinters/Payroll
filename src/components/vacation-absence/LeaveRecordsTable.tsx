"use client";

import React from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LeaveEntry } from "@/lib/mock-data-interfaces";
import { CalendarDays, FileText } from "lucide-react";
import LeaveStatusBadge from "@/components/vacation-absence/LeaveStatusBadge";
import LeaveRecordRowActions from "@/components/vacation-absence/LeaveRecordRowActions";

interface LeaveRecordsTableProps {
  leaveRecords: LeaveEntry[];
  getEmployeeName: (employeeId: string) => string;
  getEmployeeCustomId: (employeeId: string) => string;
  onEdit?: (record: LeaveEntry) => void;
  onApprove?: (id: string) => void | Promise<unknown>;
  onReject?: (id: string, reason?: string) => void | Promise<unknown>;
  onDelete?: (id: string) => void | Promise<unknown>;
  actionsDisabled?: boolean;
  showActions?: boolean;
}

const leaveTypeVariant = (type: LeaveEntry["leaveType"]) => {
  switch (type) {
    case "Annual Leave":
      return "default";
    case "Sick Leave":
      return "secondary";
    case "Unpaid Leave":
      return "destructive";
    default:
      return "outline";
  }
};

const LeaveRecordsTable: React.FC<LeaveRecordsTableProps> = ({
  leaveRecords,
  getEmployeeName,
  getEmployeeCustomId,
  onEdit,
  onApprove,
  onReject,
  onDelete,
  actionsDisabled = false,
  showActions = true,
}) => {
  if (leaveRecords.length === 0) {
    return (
      <Card className="rounded-2xl border bg-white p-10 shadow-sm">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="rounded-2xl bg-muted p-3 ring-1 ring-border">
            <CalendarDays className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No leave records in view</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Adjust filters or record a new absence to populate this list.
          </p>
        </div>
      </Card>
    );
  }

  const canAct = showActions && onEdit && onApprove && onReject && onDelete;

  return (
    <Card className="rounded-2xl border bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Leave records</CardTitle>
        <CardDescription>
          {leaveRecords.length} record{leaveRecords.length === 1 ? "" : "s"} matching the current filters.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden sm:table-cell">Dates</TableHead>
                <TableHead className="text-right">Days</TableHead>
                <TableHead className="hidden md:table-cell">Reason</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Document</TableHead>
                {canAct && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    <div className="flex min-w-[140px] flex-col">
                      <span>{getEmployeeName(record.employeeId)}</span>
                      <span className="text-xs text-muted-foreground">
                        {getEmployeeCustomId(record.employeeId)}
                      </span>
                      {record.source === "staff" && (
                        <span className="mt-1 text-xs text-cyan-700">Staff request</span>
                      )}
                      <span className="mt-1 text-xs text-muted-foreground sm:hidden">
                        {format(new Date(record.startDate), "dd MMM yyyy")} –{" "}
                        {format(new Date(record.endDate), "dd MMM yyyy")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <LeaveStatusBadge status={record.status} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={leaveTypeVariant(record.leaveType)} className="whitespace-nowrap">
                      {record.leaveType}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex flex-col text-sm">
                      <span>{format(new Date(record.startDate), "dd MMM yyyy")}</span>
                      <span className="text-xs text-muted-foreground">
                        to {format(new Date(record.endDate), "dd MMM yyyy")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-medium">{record.workingDays}</span>
                      <span className="text-xs text-muted-foreground">{record.totalDays} cal.</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden max-w-[200px] truncate md:table-cell">
                    <div className="space-y-1">
                      <p>{record.reason || "—"}</p>
                      {record.rejectionReason && (
                        <p className="text-xs text-destructive">{record.rejectionReason}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-right lg:table-cell">
                    {record.documentUrl ? (
                      <a
                        href={record.documentUrl}
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
                  {canAct && (
                    <TableCell className="text-right">
                      <LeaveRecordRowActions
                        record={record}
                        onEdit={onEdit}
                        onApprove={onApprove}
                        onReject={onReject}
                        onDelete={onDelete}
                        disabled={actionsDisabled}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaveRecordsTable;
