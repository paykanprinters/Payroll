"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Clock as ClockIcon,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TimesheetEntry, MockEmployee } from "@/lib/mock-data-interfaces";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import SummaryAccent from "@/components/dashboard/SummaryAccent";

interface TimesheetTableProps {
  timesheets: TimesheetEntry[];
  employees: MockEmployee[];
  listVersion?: string;
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
  listVersion = "",
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
  const paginatedTimesheets = sortedTimesheets.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [listVersion]);

  React.useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const pageBlock = React.useMemo(() => {
    const blockStart = Math.floor((currentPage - 1) / 10) * 10 + 1;
    const blockEnd = Math.min(totalPages, blockStart + 9);
    return { blockStart, blockEnd };
  }, [currentPage, totalPages]);

  const pageNumbers = React.useMemo(() => {
    const list: number[] = [];
    for (let p = pageBlock.blockStart; p <= pageBlock.blockEnd; p++) list.push(p);
    return list;
  }, [pageBlock.blockStart, pageBlock.blockEnd]);

  return (
    <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
      <SummaryAccent variant="emerald" />
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Timesheet entries</CardTitle>
        <CardDescription>
          Review entries, open the weekly editor from an employee name, and move status toward payroll.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sortedTimesheets.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="hidden sm:table-cell">In</TableHead>
                    <TableHead className="hidden sm:table-cell">Out</TableHead>
                    <TableHead className="text-right">Work</TableHead>
                    <TableHead className="hidden md:table-cell text-right">OT</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell text-center">Flags</TableHead>
                    <TableHead className="text-right min-w-[120px]">Actions</TableHead>
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
                          <div className="mt-1 text-xs text-muted-foreground sm:hidden">
                            {entry.timeIn || "—"} → {entry.timeOut || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs">{entry.date}</TableCell>
                        <TableCell className="hidden sm:table-cell">{entry.timeIn || "—"}</TableCell>
                        <TableCell className="hidden sm:table-cell">{entry.timeOut || "—"}</TableCell>
                        <TableCell className="text-right">{entry.totalWorkHours.toFixed(2)}</TableCell>
                        <TableCell className="hidden md:table-cell text-right">
                          {entry.overtimeHours.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadgeClass(entry.status)}>
                            {entry.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-center">
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
                          <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
                            <div className="flex gap-1">
                              <Button variant="outline" size="icon" onClick={() => onEdit(entry)} aria-label="Edit">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="icon" aria-label="Delete">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete timesheet entry?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This removes the entry for {emp?.name || "this employee"} on {entry.date}.
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onDelete(entry.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                            <Select
                              onValueChange={(value: TimesheetEntry["status"]) =>
                                onStatusChange(entry.id, value)
                              }
                              value={entry.status}
                            >
                              <SelectTrigger className="h-9 w-full min-w-[120px] sm:w-[132px]">
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
            </div>

            {totalPages > 1 && (
              <Pagination className="my-4">
                <PaginationContent className="flex-wrap gap-1">
                  <PaginationItem>
                    <PaginationLink
                      size="default"
                      onClick={() => setCurrentPage(1)}
                      className={cn("rounded-full bg-white gap-1 pl-2.5 pr-3", currentPage === 1 && "pointer-events-none opacity-50")}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">First</span>
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink
                      size="default"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      className={cn("rounded-full bg-white gap-1 pl-2.5 pr-3", currentPage === 1 && "pointer-events-none opacity-50")}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Back</span>
                    </PaginationLink>
                  </PaginationItem>
                  {pageNumbers.map((p) => (
                    <PaginationItem key={p}>
                      <PaginationLink
                        onClick={() => setCurrentPage(p)}
                        isActive={currentPage === p}
                        className={cn(
                          "rounded-full bg-white",
                          currentPage === p &&
                            "bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground"
                        )}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationLink
                      size="default"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      className={cn(
                        "rounded-full bg-white gap-1 pl-3 pr-2.5",
                        currentPage === totalPages && "pointer-events-none opacity-50"
                      )}
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink
                      size="default"
                      onClick={() => setCurrentPage(totalPages)}
                      className={cn(
                        "rounded-full bg-white gap-1 pl-3 pr-2.5",
                        currentPage === totalPages && "pointer-events-none opacity-50"
                      )}
                    >
                      <span className="hidden sm:inline">Last</span>
                      <ChevronsRight className="h-4 w-4" />
                    </PaginationLink>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">
            No timesheet entries match your filters.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TimesheetTable;
