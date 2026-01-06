"use client";

import React, { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Filter, RefreshCcw, CalendarDays, Search } from "lucide-react";
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

  totals: { filteredCount: number; totalCount: number };
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
  totals,
  disabled = false,
}) => {
  // Debounced search: keep local typing value, commit via onSearchChange after delay
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

  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={employeeFilterId}
            onValueChange={onEmployeeFilterChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.customEmployeeId || "N/A"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={frequencyFilter}
            onValueChange={(v) => onFrequencyFilterChange(v as FrequencyFilter)}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pay frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Monthly">Monthly</SelectItem>
              <SelectItem value="Weekly">Weekly</SelectItem>
              <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Date From</Label>
          <div className="flex items-center gap-1 mt-1">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateStart}
              onChange={(e) => onDateStartChange(e.target.value)}
              className="flex-1"
              disabled={disabled}
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Date To</Label>
          <div className="flex items-center gap-1 mt-1">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateEnd}
              onChange={(e) => onDateEndChange(e.target.value)}
              className="flex-1"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search by employee name or number..."
            className="pl-8 rounded-full"
            aria-label="Search payslips"
            disabled={disabled}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="rounded-full"
          title="Refresh payslips"
          disabled={disabled}
        >
          <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
        </Button>
        <span className="text-xs text-muted-foreground">
          Showing {totals.filteredCount} of {totals.totalCount}
        </span>
      </div>
    </div>
  );
};

export default PayslipsOverviewToolbar;