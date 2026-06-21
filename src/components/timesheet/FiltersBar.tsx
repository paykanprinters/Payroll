"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Filter, ArrowDownAZ, ArrowUpAZ, CalendarDays, Users, LayoutGrid, Rows3, Table2 } from "lucide-react";
import { MockEmployee } from "@/lib/mock-data-interfaces";

type SortKey = "dateAsc" | "dateDesc" | "nameAsc" | "nameDesc" | "personalAsc" | "personalDesc";
export type ImportPreviewViewMode = "table" | "cards" | "grid";

type Props = {
  employees: MockEmployee[];
  compact: boolean;
  setCompact: (v: boolean) => void;

  viewMode: ImportPreviewViewMode;
  setViewMode: (v: ImportPreviewViewMode) => void;

  groupByEmployee: boolean;
  setGroupByEmployee: (v: boolean) => void;

  filterEmployeeId: string;
  setFilterEmployeeId: (v: string) => void;

  filterEmployeeName: string;
  setFilterEmployeeName: (v: string) => void;

  filterPersonalId: string;
  setFilterPersonalId: (v: string) => void;

  filterDateStart: string;
  setFilterDateStart: (v: string) => void;

  filterDateEnd: string;
  setFilterDateEnd: (v: string) => void;

  sortKey: SortKey;
  setSortKey: (v: SortKey) => void;

  onResetFilters: () => void;

  totalCount: number;
  filteredCount: number;

  importFilteredOnly: boolean;
  setImportFilteredOnly: (v: boolean) => void;

  externalIdLabel?: string;
};

const FiltersBar: React.FC<Props> = ({
  employees,
  compact,
  setCompact,
  viewMode,
  setViewMode,
  groupByEmployee,
  setGroupByEmployee,
  filterEmployeeId,
  setFilterEmployeeId,
  filterEmployeeName,
  setFilterEmployeeName,
  filterPersonalId,
  setFilterPersonalId,
  filterDateStart,
  setFilterDateStart,
  filterDateEnd,
  setFilterDateEnd,
  sortKey,
  setSortKey,
  onResetFilters,
  totalCount,
  filteredCount,
  importFilteredOnly,
  setImportFilteredOnly,
  externalIdLabel = "Personal ID (CSV)",
}) => {
  return (
    <div className="flex flex-col gap-3 pb-2 border-b">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Filters</span>
        <div className="ml-auto flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Preview layout</Label>
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ImportPreviewViewMode)}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="table">
                  <Table2 className="mr-2 inline h-4 w-4" /> Row table
                </SelectItem>
                <SelectItem value="cards">
                  <Rows3 className="mr-2 inline h-4 w-4" /> Day cards
                </SelectItem>
                <SelectItem value="grid">
                  <LayoutGrid className="mr-2 inline h-4 w-4" /> Week grid
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {viewMode === "table" && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="groupByEmployee">Group by employee</Label>
              <Switch id="groupByEmployee" checked={groupByEmployee} onCheckedChange={setGroupByEmployee} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Label htmlFor="compact">Compact</Label>
            <Switch id="compact" checked={compact} onCheckedChange={setCompact} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2">
        <div>
          <Label className="text-xs">Employee</Label>
          <Select
            value={filterEmployeeId === "" ? "all" : filterEmployeeId}
            onValueChange={(v) => setFilterEmployeeId(v === "all" ? "" : v)}
          >
            <SelectTrigger className="mt-1">
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

        <div>
          <Label className="text-xs">Employee Name</Label>
          <Input
            placeholder="Search name"
            value={filterEmployeeName}
            onChange={(e) => setFilterEmployeeName(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs">{externalIdLabel}</Label>
          <Input
            placeholder="Search personal ID"
            value={filterPersonalId}
            onChange={(e) => setFilterPersonalId(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs">Date From</Label>
          <div className="flex items-center gap-1 mt-1">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={filterDateStart}
              onChange={(e) => setFilterDateStart(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Date To</Label>
          <div className="flex items-center gap-1 mt-1">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={filterDateEnd}
              onChange={(e) => setFilterDateEnd(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs">Sort</Label>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dateAsc"><ArrowDownAZ className="inline h-4 w-4 mr-1" /> Date (oldest first)</SelectItem>
            <SelectItem value="dateDesc"><ArrowUpAZ className="inline h-4 w-4 mr-1" /> Date (newest first)</SelectItem>
            <SelectItem value="nameAsc"><ArrowDownAZ className="inline h-4 w-4 mr-1" /> Name (A→Z)</SelectItem>
            <SelectItem value="nameDesc"><ArrowUpAZ className="inline h-4 w-4 mr-1" /> Name (Z→A)</SelectItem>
            <SelectItem value="personalAsc"><ArrowDownAZ className="inline h-4 w-4 mr-1" /> Personal ID (↑)</SelectItem>
            <SelectItem value="personalDesc"><ArrowUpAZ className="inline h-4 w-4 mr-1" /> Personal ID (↓)</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={onResetFilters} className="ml-auto">
          Reset Filters
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Showing {filteredCount} of {totalCount} rows
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="importFilteredOnly" className="text-xs">Import only filtered rows</Label>
          <Switch id="importFilteredOnly" checked={importFilteredOnly} onCheckedChange={setImportFilteredOnly} />
        </div>
      </div>
    </div>
  );
};

export default FiltersBar;