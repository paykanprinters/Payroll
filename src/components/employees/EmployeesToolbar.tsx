"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ListFilter, ArrowUpDown, RefreshCcw, Search, X } from "lucide-react";

type SortField = "name" | "jobTitle" | "startDate" | "customEmployeeId";
type SortDir = "asc" | "desc";

export const UNASSIGNED_DEPARTMENT = "__unassigned__";

interface EmployeesToolbarProps {
  jobTitles: string[];
  departments: string[];
  hasUnassignedDepartment: boolean;
  jobTitleFilter: string;
  setJobTitleFilter: (v: string) => void;
  departmentFilter: string;
  setDepartmentFilter: (v: string) => void;
  payBasisFilter: "all" | "salary" | "hourly";
  setPayBasisFilter: (v: "all" | "salary" | "hourly") => void;
  portalAccessFilter: "all" | "true" | "false";
  setPortalAccessFilter: (v: "all" | "true" | "false") => void;
  employmentStatusFilter: "all" | "Active" | "Resigned" | "Terminated";
  setEmploymentStatusFilter: (v: "all" | "Active" | "Resigned" | "Terminated") => void;
  sortField: SortField;
  setSortField: (v: SortField) => void;
  sortDir: SortDir;
  setSortDir: (v: SortDir) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  onRefresh?: () => void;
  onClear?: () => void;
  totalCount: number;
  filteredCount: number;
}

const EmployeesToolbar: React.FC<EmployeesToolbarProps> = ({
  jobTitles,
  departments,
  hasUnassignedDepartment,
  jobTitleFilter,
  setJobTitleFilter,
  departmentFilter,
  setDepartmentFilter,
  payBasisFilter,
  setPayBasisFilter,
  portalAccessFilter,
  setPortalAccessFilter,
  employmentStatusFilter,
  setEmploymentStatusFilter,
  sortField,
  setSortField,
  sortDir,
  setSortDir,
  searchTerm,
  setSearchTerm,
  onRefresh,
  onClear,
  totalCount,
  filteredCount,
}) => {
  const hasActiveFilters =
    jobTitleFilter !== "all" ||
    departmentFilter !== "all" ||
    payBasisFilter !== "all" ||
    portalAccessFilter !== "all" ||
    employmentStatusFilter !== "all" ||
    searchTerm.trim().length > 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="flex items-center gap-2">
          <ListFilter className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Select value={jobTitleFilter} onValueChange={setJobTitleFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Job title" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All job titles</SelectItem>
              {jobTitles.map((jt) => (
                <SelectItem key={jt} value={jt}>{jt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <ListFilter className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {hasUnassignedDepartment && (
                <SelectItem value={UNASSIGNED_DEPARTMENT}>Unassigned</SelectItem>
              )}
              {departments.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <ListFilter className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Select value={payBasisFilter} onValueChange={(v: "all" | "salary" | "hourly") => setPayBasisFilter(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pay basis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All pay types</SelectItem>
              <SelectItem value="salary">Salary</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <ListFilter className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Select
            value={portalAccessFilter}
            onValueChange={(v: "all" | "true" | "false") => setPortalAccessFilter(v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Portal access" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All portal states</SelectItem>
              <SelectItem value="true">Portal enabled</SelectItem>
              <SelectItem value="false">Portal disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <ListFilter className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Select
            value={employmentStatusFilter}
            onValueChange={(v: "all" | "Active" | "Resigned" | "Terminated") =>
              setEmploymentStatusFilter(v)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Employment status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Resigned">Resigned</SelectItem>
              <SelectItem value="Terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_auto]">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Select value={sortField} onValueChange={(v: SortField) => setSortField(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="jobTitle">Job title</SelectItem>
              <SelectItem value="startDate">Start date</SelectItem>
              <SelectItem value="customEmployeeId">Employee ID</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Select value={sortDir} onValueChange={(v: SortDir) => setSortDir(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} className="rounded-full">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {hasActiveFilters && onClear && (
            <Button variant="ghost" size="sm" onClick={onClear} className="rounded-full">
              Clear filters
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            Showing {filteredCount} of {totalCount}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search ID, name, title, department, email…"
            className="rounded-full pl-8"
            aria-label="Search employees"
          />
        </div>
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchTerm("")}
            aria-label="Clear search"
            className="rounded-full px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default EmployeesToolbar;
