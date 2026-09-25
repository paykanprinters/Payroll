"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { formatEmployeePickerLabel } from "@/lib/employment-status";
import { Plus, Search } from "lucide-react";

interface SavingsFiltersBarProps {
  employees: MockEmployee[];
  employeeFilterId: string; // "all" or employee id
  onEmployeeFilterChange: (v: string) => void;
  frequencyFilter: "all" | "monthly" | "weekly";
  onFrequencyFilterChange: (v: "all" | "monthly" | "weekly") => void;
  statusFilter: "all" | "active" | "completed" | "paused";
  onStatusFilterChange: (v: "all" | "active" | "completed" | "paused") => void;
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
  statusFilter,
  onStatusFilterChange,
  search,
  onSearchChange,
  onAddNewPlanClick,
}) => {
  return (
    <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                {formatEmployeePickerLabel(emp, { includeCode: true })}
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
        <Label htmlFor="status-filter">Status</Label>
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            onStatusFilterChange(v as "all" | "active" | "completed" | "paused")
          }
        >
          <SelectTrigger id="status-filter" className="mt-1">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="search-input">Search</Label>
        <div className="relative mt-1">
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

      <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
        <Button onClick={onAddNewPlanClick} className="w-full">
          <Plus className="mr-2 h-4 w-4" /> Add Plan
        </Button>
      </div>
    </div>
  );
};

export default SavingsFiltersBar;