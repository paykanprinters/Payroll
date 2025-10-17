"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface TimesheetTableProps {
  timesheets: TimesheetEntry[];
  employees: MockEmployee[];
  onEdit: (timesheet: TimesheetEntry) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: TimesheetEntry["status"]) => void;
  onEmployeeClick: (employeeId: string, date: string) => void;
}

const ITEMS_PER_PAGE = 10;

const TimesheetTable: React.FC<TimesheetTableProps> = ({
  timesheets,
  employees,
  onEdit,
  onDelete,
  onStatusChange,
  onEmployeeClick,
}) => {
  const [currentPage, setCurrentPage] = React.useState(1);

  const getEmployeeDisplayId = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.customEmployeeId : "Unknown";
  };

  const sortedTimesheets = React.useMemo(() => {
    return [...timesheets].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [timesheets]);

  const totalPages = Math.ceil(sortedTimesheets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTimesheets = sortedTimesheets.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [timesheets]);

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
                <TableRow><TableHead>Employee ID</TableHead><TableHead>Date</TableHead><TableHead>Time In</TableHead><TableHead>Time Out</TableHead><TableHead>Work Hours</TableHead><TableHead>Overtime</TableHead><TableHead>Status</TableHead><TableHead className="text-center">Flags</TableHead><TableHead className="text-center">Actions</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTimesheets.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell
                      className="font-medium cursor-pointer hover:underline text-blue-600"
                      onClick={() => onEmployeeClick(entry.employeeId, entry.date)}
                    >
                      {getEmployeeDisplayId(entry.employeeId)}
                    </TableCell>
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
                        {entry.absent && <XCircle className="h-4 w-4 text-red-500" />}
                        {entry.lateArrival && <ClockIcon className="h-4 w-4 text-yellow-500" />}
                        {entry.earlyDeparture && <ClockIcon className="h-4 w-4 text-orange-500" />}
                        {!entry.absent && !entry.lateArrival && !entry.earlyDeparture && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </div>
                    </TableCell>
                    <TableCell className="flex justify-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => onEdit(entry)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => onDelete(entry.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Select onValueChange={(value: TimesheetEntry["status"]) => onStatusChange(entry.id, value)} value={entry.status}>
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
            {totalPages > 1 && (
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={handlePreviousPage}
                      className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        onClick={() => setCurrentPage(i + 1)}
                        isActive={currentPage === i + 1}
                      >
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
          <div className="text-center py-8 text-muted-foreground">
            No timesheet entries found.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TimesheetTable;