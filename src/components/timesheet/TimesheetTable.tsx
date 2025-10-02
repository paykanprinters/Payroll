"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock as ClockIcon, CheckCircle, XCircle, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TimesheetEntry } from "@/lib/mock-data-interfaces";

interface TimesheetTableProps {
  timesheets: TimesheetEntry[];
  getEmployeeName: (employeeId: string) => string;
  onEdit: (timesheet: TimesheetEntry) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: TimesheetEntry["status"]) => void;
}

const TimesheetTable: React.FC<TimesheetTableProps> = ({
  timesheets,
  getEmployeeName,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Timesheet Entries</CardTitle>
        <CardDescription>Overview of recorded employee working hours.</CardDescription>
      </CardHeader>
      <CardContent>
        {timesheets.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time In</TableHead>
                  <TableHead>Time Out</TableHead>
                  <TableHead>Work Hours</TableHead>
                  <TableHead>Overtime</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Flags</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timesheets.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{getEmployeeName(entry.employeeId)}</TableCell>
                    <TableCell>{entry.date}</TableCell>
                    <TableCell>{entry.timeIn || "N/A"}</TableCell>
                    <TableCell>{entry.timeOut || "N/A"}</TableCell>
                    <TableCell>{entry.totalWorkHours.toFixed(2)}</TableCell>
                    <TableCell>{entry.overtimeHours.toFixed(2)}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          entry.status === "Approved" && "bg-green-100 text-green-800",
                          entry.status === "Submitted" && "bg-blue-100 text-blue-800",
                          entry.status === "Draft" && "bg-gray-100 text-gray-800",
                          entry.status === "Locked" && "bg-red-100 text-red-800",
                        )}
                      >
                        {entry.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        {entry.absent && <XCircle className="h-4 w-4 text-red-500" title="Absent" />}
                        {entry.lateArrival && <ClockIcon className="h-4 w-4 text-yellow-500" title="Late Arrival" />}
                        {entry.earlyDeparture && <ClockIcon className="h-4 w-4 text-orange-500" title="Early Departure" />}
                        {!entry.absent && !entry.lateArrival && !entry.earlyDeparture && <CheckCircle className="h-4 w-4 text-green-500" title="No Flags" />}
                      </div>
                    </TableCell>
                    <TableCell className="flex justify-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => onEdit(entry)} disabled={entry.status === "Approved" || entry.status === "Locked"}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => onDelete(entry.id)} disabled={entry.status === "Approved" || entry.status === "Locked"}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Select onValueChange={(value: TimesheetEntry["status"]) => onStatusChange(entry.id, value)} value={entry.status} disabled={entry.status === "Locked"}>
                        <SelectTrigger className="w-[120px] h-8">
                          <SelectValue placeholder="Change Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Draft">Draft</SelectItem>
                          <SelectItem value="Submitted">Submitted</SelectItem>
                          <SelectItem value="Approved">Approved</SelectItem>
                          <SelectItem value="Locked">Locked</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No timesheet entries found.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TimesheetTable;