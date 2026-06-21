"use client";

import React, { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Filter, RefreshCcw, Search, X } from "lucide-react";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { FrequencyFilter } from "@/hooks/selectors/usePayslipsOverviewSelectors";

interface Props {
  employees: MockEmployee[];
  employeeFilterId: string;
  onEmployeeFilterChange: (v: string) => void;
  frequencyFilter: FrequencyFilter;
  onFrequencyFilterChange: (v: FrequencyFilter) => void;
  dateStart: string;
  onDateStartChange: (v: string) => void;
  dateEnd: string;
  onDateEndChange: (v: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  onRefresh: () => void;
  onClear: () => void;
  totals: { filteredCount: number; totalCount: number };
  hideAllOption?: boolean;
  disabled?: boolean;
}

const PayslipsOverviewToolbar: React.FC<Props> = ({
  employees,
  employeeFilterId,
  onEmployeeFilterChange,
  frequencyFilter,
  onFrequencyFilterChange,
  dateStart,
  onDateStartChange,
  dateEnd,
  onDateEndChange,
  search,
  onSearchChange,
  onRefresh,
  onClear,
  totals,
  hideAllOption = false,
  disabled = false,
}) => {
  const [localSearch, setLocalSearch] = useState(search || "");

  useEffect(() => {
    setLocalSearch(search || "");
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (localSearch !== search) onSearchChange(localSearch);
    }, 300);
    return () => clearTimeout(t);
  }, [localSearch, search, onSearchChange]);

  const hasActiveFilters =
    employeeFilterId !== "all" ||
    frequencyFilter !== "all" ||
    dateStart.length > 0 ||
    dateEnd.length > 0 ||
    search.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="payslip-employee-filter">Employee</Label>
          <Select
            value={employeeFilterId}
            onValueChange={onEmployeeFilterChange}
            disabled={disabled}
          >
            <SelectTrigger id="payslip-employee-filter">
              <SelectValue placeholder="All employees" />
            </SelectTrigger>
            <SelectContent>
              {!hideAllOption && <SelectItem value="all">All employees</SelectItem>}
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.customEmployeeId || "N/A"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="payslip-frequency-filter">Pay frequency</Label>
          <Select
            value={frequencyFilter}
            onValueChange={(v) => onFrequencyFilterChange(v as FrequencyFilter)}
            disabled={disabled}
          >
            <SelectTrigger id="payslip-frequency-filter">
              <SelectValue placeholder="All frequencies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All frequencies</SelectItem>
              <SelectItem value="Monthly">Monthly</SelectItem>
              <SelectItem value="Weekly">Weekly</SelectItem>
              <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="payslip-date-start">Period from</Label>
          <Input
            id="payslip-date-start"
            type="date"
            value={dateStart}
            onChange={(e) => onDateStartChange(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="payslip-date-end">Period to</Label>
          <Input
            id="payslip-date-end"
            type="date"
            value={dateEnd}
            onChange={(e) => onDateEndChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search employee, ID, pay period, or pay date…"
            className="pl-8"
            aria-label="Search payslips"
            disabled={disabled}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={disabled} className="rounded-full">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClear} disabled={disabled} className="rounded-full">
              <Filter className="mr-2 h-4 w-4" />
              Clear filters
            </Button>
          )}
          {localSearch && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setLocalSearch("");
                onSearchChange("");
              }}
              aria-label="Clear search"
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            Showing {totals.filteredCount} of {totals.totalCount}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PayslipsOverviewToolbar;
