"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ListFilter, ArrowUpDown, RefreshCcw, Search, X } from "lucide-react";

type SortField = "name" | "jobTitle" | "startDate" | "customEmployeeId";
type SortDir = "asc" | "desc";

interface EmployeesToolbarProps {
  jobTitles: string[];
  departments: string[];
  jobTitleFilter: string;
  setJobTitleFilter: (v: string) => void;
  departmentFilter: string;
  setDepartmentFilter: (v: string) => void;
  payBasisFilter: "all" | "salary" | "hourly";
  setPayBasisFilter: (v: "all" | "salary" | "hourly") => void;
  portalAccessFilter: "all" | "true" | "false";
  setPortalAccessFilter: (v: "all" | "true" | "false") => void;
  sortField: SortField;
  setSortField: (v: SortField) => void;
  sortDir: SortDir;
  setSortDir: (v: SortDir) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  onRefresh?: () => void;
  totalCount: number;
  filteredCount: number;
}

const EmployeesToolbar: React.FC<EmployeesToolbarProps> = ({
  jobTitles,
  departments,
  jobTitleFilter,
  setJobTitleFilter,
  departmentFilter,
  setDepartmentFilter,
  payBasisFilter,
  setPayBasisFilter,
  portalAccessFilter,
  setPortalAccessFilter,
  sortField,
  setSortField,
  sortDir,
  setSortDir,
  searchTerm,
  setSearchTerm,
  onRefresh,
  totalCount,
  filteredCount,
}) => {
  return (
    <Card className="border rounded-xl">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-muted-foreground" />
            <Select value={jobTitleFilter} onValueChange={setJobTitleFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Job title" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All job titles</SelectItem>
                {jobTitles.map((jt) => <SelectItem key={jt} value={jt}>{jt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-muted-foreground" />
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-muted-foreground" />
            <Select value={payBasisFilter} onValueChange={(v: "all" | "salary" | "hourly") => setPayBasisFilter(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pay basis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="salary">Salary</SelectItem>
                <SelectItem value="hourly">Hourly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-muted-foreground" />
            <Select value={portalAccessFilter} onValueChange={(v: "all" | "true" | "false") => setPortalAccessFilter(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Portal access" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Enabled</SelectItem>
                <SelectItem value="false">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortField} onValueChange={(v: SortField) => setSortField(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="jobTitle">Job Title</SelectItem>
                <SelectItem value="startDate">Start Date</SelectItem>
                <SelectItem value="customEmployeeId">Employee ID</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="rounded-full"
              title="Refresh employees"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <span className="text-xs text-muted-foreground">
              Showing {filteredCount} of {totalCount}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, name, title, department, email..."
              className="pl-8 rounded-full"
              aria-label="Search employees"
            />
          </div>
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
              className="px-2 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeesToolbar;