"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock as ClockIcon, CheckCircle, XCircle, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TimesheetEntry, MockEmployee } from "@/lib/mock-data-interfaces";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import SummaryAccent from "@/components/dashboard/SummaryAccent";

interface TimesheetTableProps {
  timesheets: TimesheetEntry[];
  employees: MockEmployee[];
  onEdit: (timesheet: TimesheetEntry) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: TimesheetEntry["status"]) => void;
  onEmployeeClick: (employeeId: string, date: string) => void;
}

const ITEMS_PER_PAGE = 10;

const statusBadgeClass = (status: TimesheetEntry["status"]) => {
  if (status === "Approved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "Submitted") return "bg-sky-50 text-sky-700 border-sky-200";
  if (status === "Draft") return "bg-muted text-foreground border-border";
  if (status === "Locked") return "bg-rose-50 text-rose-700 border-rose-200";
  return "";
};

const TimesheetTable: React.FC<TimesheetTableProps> = ({
  timesheets,
  employees,
  onEdit,
  onDelete,
  onStatusChange,
  onEmployeeClick,
}) => {
  const [currentPage, setCurrentPage] = React.useState(1);

  const employeesById = React.useMemo(() => {
    const map = new Map<string, { name: string; customId: string }>();
    employees.forEach((emp) =>
      map.set(emp.id, {
        name: `${emp.firstName} ${emp.lastName}`.trim(),
        customId: emp.customEmployeeId || "N/A",
      })
    );
    return map;
  }, [employees]);

  const sortedTimesheets = React.useMemo(() => {
    return [...timesheets].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [timesheets]);

  const totalPages = Math.max(1, Math.ceil(sortedTimesheets.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTimesheets = sortedTimesheets.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  React.useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  return (
    <Card className="mt-6 relative overflow-hidden rounded-2xl border bg-white shadow-sm">
      <SummaryAccent variant="emerald" />
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Timesheet entries</CardTitle>
        <CardDescription>Review, edit, and move entries through status updates.</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedTimesheets.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time In</TableHead>
                  <TableHead>Time Out</TableHead>
                  <TableHead className="text-right">Work</TableHead>
                  <TableHead className="text-right">OT</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Flags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTimesheets.map((entry) => {
                  const emp = employeesById.get(entry.employeeId);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <button
                          type="button"
                          className="text-left text-sm font-medium text-primary hover:underline"
                          onClick={() => onEmployeeClick(entry.employeeId, entry.date)}
                        >
                          {emp?.name || entry.employeeId}
                        </button>
                        <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                          {emp?.customId || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{entry.date}</TableCell>
                      <TableCell>{entry.timeIn || "N/A"}</TableCell>
                      <TableCell>{entry.timeOut || "N/A"}</TableCell>
                      <TableCell className="text-right">{entry.totalWorkHours.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{entry.overtimeHours.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadgeClass(entry.status)}>
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {entry.absent && <XCircle className="h-4 w-4 text-rose-600" />}
                          {entry.lateArrival && <ClockIcon className="h-4 w-4 text-amber-600" />}
                          {entry.earlyDeparture && <ClockIcon className="h-4 w-4 text-orange-600" />}
                          {!entry.absent && !entry.lateArrival && !entry.earlyDeparture && (
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" onClick={() => onEdit(entry)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => onDelete(entry.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Select
                            onValueChange={(value: TimesheetEntry["status"]) => onStatusChange(entry.id, value)}
                            value={entry.status}
                          >
                            <SelectTrigger className="h-10 w-[140px] rounded-lg">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Draft">Draft</SelectItem>
                              <SelectItem value="Submitted">Submitted</SelectItem>
                              <SelectItem value="Approved">Approved</SelectItem>
                              <SelectItem value="Locked">Locked</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <Pagination className="my-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={handlePreviousPage}
                      className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink onClick={() => setCurrentPage(i + 1)} isActive={currentPage === i + 1}>
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={handleNextPage}
                      className={cn(currentPage === totalPages && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border bg-white py-10 text-center text-muted-foreground">
            No timesheet entries found.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TimesheetTable;