"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Filter, RefreshCcw, X } from "lucide-react";
import { MockEmployee } from "@/lib/mock-data-interfaces";

interface TimesheetFiltersBarProps {
  employees: MockEmployee[];
  staffView?: boolean;
  statusFilter: "all" | "Draft" | "Submitted" | "Approved" | "Locked";
  onStatusFilterChange: (value: "all" | "Draft" | "Submitted" | "Approved" | "Locked") => void;
  employeeFilterId: string;
  onEmployeeFilterChange: (value: string) => void;
  dateStart: string;
  onDateStartChange: (value: string) => void;
  dateEnd: string;
  onDateEndChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  filteredCount: number;
  totalCount: number;
  onClear: () => void;
  onRefresh: () => void;
}

const TimesheetFiltersBar: React.FC<TimesheetFiltersBarProps> = ({
  employees,
  staffView = false,
  statusFilter,
  onStatusFilterChange,
  employeeFilterId,
  onEmployeeFilterChange,
  dateStart,
  onDateStartChange,
  dateEnd,
  onDateEndChange,
  search,
  onSearchChange,
  filteredCount,
  totalCount,
  onClear,
  onRefresh,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="timesheet-status-filter">Status</Label>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger id="timesheet-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Submitted">Submitted</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Locked">Locked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!staffView ? (
          <div className="space-y-1">
            <Label htmlFor="timesheet-employee-filter">Employee</Label>
            <Select value={employeeFilterId} onValueChange={onEmployeeFilterChange}>
              <SelectTrigger id="timesheet-employee-filter">
                <SelectValue placeholder="All employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.customEmployeeId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex items-end">
            <p className="text-sm text-muted-foreground">Showing your entries only</p>
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="timesheet-date-start">Date from</Label>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              id="timesheet-date-start"
              type="date"
              value={dateStart}
              onChange={(e) => onDateStartChange(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="timesheet-date-end">Date to</Label>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              id="timesheet-date-end"
              type="date"
              value={dateEnd}
              onChange={(e) => onDateEndChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or employee number..."
          className="lg:flex-1"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
          <span className="text-xs text-muted-foreground">
            <Filter className="mr-1 inline h-3 w-3" />
            {filteredCount} of {totalCount}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TimesheetFiltersBar;
