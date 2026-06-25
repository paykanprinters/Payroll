"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, RefreshCcw, Search, X } from "lucide-react";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { ALL_LEAVE_TYPES } from "@/lib/leave-admin-summary";
import { LEAVE_STATUSES } from "@/lib/leave-status";

interface LeaveFiltersBarProps {
  employees: MockEmployee[];
  employeeFilterId: string;
  onEmployeeFilterChange: (value: string) => void;
  leaveTypeFilter: string;
  onLeaveTypeFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
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

const LeaveFiltersBar: React.FC<LeaveFiltersBarProps> = ({
  employees,
  employeeFilterId,
  onEmployeeFilterChange,
  leaveTypeFilter,
  onLeaveTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
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
  const hasActiveFilters =
    employeeFilterId !== "all" ||
    leaveTypeFilter !== "all" ||
    statusFilter !== "all" ||
    dateStart.length > 0 ||
    dateEnd.length > 0 ||
    search.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-1">
          <Label htmlFor="leave-employee-filter">Employee</Label>
          <Select value={employeeFilterId} onValueChange={onEmployeeFilterChange}>
            <SelectTrigger id="leave-employee-filter">
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

        <div className="space-y-1">
          <Label htmlFor="leave-type-filter">Leave type</Label>
          <Select value={leaveTypeFilter} onValueChange={onLeaveTypeFilterChange}>
            <SelectTrigger id="leave-type-filter">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {ALL_LEAVE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="leave-status-filter">Status</Label>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger id="leave-status-filter">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {LEAVE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="leave-date-start">From date</Label>
          <Input
            id="leave-date-start"
            type="date"
            value={dateStart}
            onChange={(e) => onDateStartChange(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="leave-date-end">To date</Label>
          <Input
            id="leave-date-end"
            type="date"
            value={dateEnd}
            onChange={(e) => onDateEndChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="leave-search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search employee, type, reason, dates…"
            className="pl-8"
            aria-label="Search leave records"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} className="rounded-full">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClear} className="rounded-full">
              <Filter className="mr-2 h-4 w-4" />
              Clear filters
            </Button>
          )}
          {search && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            Showing {filteredCount} of {totalCount}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LeaveFiltersBar;
