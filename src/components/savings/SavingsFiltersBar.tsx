"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { Plus, Filter as FilterIcon, Search } from "lucide-react";

interface SavingsFiltersBarProps {
  employees: MockEmployee[];
  employeeFilterId: string; // "all" or employee id
  onEmployeeFilterChange: (v: string) => void;
  frequencyFilter: "all" | "monthly" | "weekly";
  onFrequencyFilterChange: (v: "all" | "monthly" | "weekly") => void;
  search: string;
  onSearchChange: (v: string) => void;
  onAddNewPlanClick: () => void;
}

const SavingsFiltersBar: React.FC<SavingsFiltersBarProps> = ({
  employees,
  employeeFilterId,
  onEmployeeFilterChange,
  frequencyFilter,
  onFrequencyFilterChange,
  search,
  onSearchChange,
  onAddNewPlanClick,
}) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
      <div>
        <Label htmlFor="employee-filter">Filter by Employee</Label>
        <Select value={employeeFilterId} onValueChange={onEmployeeFilterChange}>
          <SelectTrigger id="employee-filter" className="mt-1">
            <SelectValue placeholder="Employee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map(emp => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName} ({emp.customEmployeeId})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="frequency-filter">Frequency</Label>
        <Select value={frequencyFilter} onValueChange={(v) => onFrequencyFilterChange(v as "all" | "monthly" | "weekly")}>
          <SelectTrigger id="frequency-filter" className="mt-1">
            <SelectValue placeholder="Frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="search-input">Search</Label>
        <div className="mt-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search-input"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Name or Employee ID..."
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="w-full">
          <FilterIcon className="mr-2 h-4 w-4" /> Apply Filters
        </Button>
        <Button onClick={onAddNewPlanClick} className="w-full">
          <Plus className="mr-2 h-4 w-4" /> Add Plan
        </Button>
      </div>
    </div>
  );
};

export default SavingsFiltersBar;