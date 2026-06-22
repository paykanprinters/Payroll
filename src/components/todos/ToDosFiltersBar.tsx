"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, RefreshCcw, Search, Sparkles, X } from "lucide-react";
import type { TodoSeverityFilter } from "@/lib/todos-admin-summary";

interface ToDosFiltersBarProps {
  severityFilter: TodoSeverityFilter;
  onSeverityFilterChange: (value: TodoSeverityFilter) => void;
  moduleFilter: string;
  onModuleFilterChange: (value: string) => void;
  modules: string[];
  search: string;
  onSearchChange: (value: string) => void;
  filteredCount: number;
  totalCount: number;
  onClear: () => void;
  onRefresh: () => void;
  onGenerate: () => void;
  generateDisabled: boolean;
  generateTitle?: string;
  isMockDataEnabled: boolean;
}

const ToDosFiltersBar: React.FC<ToDosFiltersBarProps> = ({
  severityFilter,
  onSeverityFilterChange,
  moduleFilter,
  onModuleFilterChange,
  modules,
  search,
  onSearchChange,
  filteredCount,
  totalCount,
  onClear,
  onRefresh,
  onGenerate,
  generateDisabled,
  generateTitle,
  isMockDataEnabled,
}) => {
  const hasActiveFilters =
    severityFilter !== "all" || moduleFilter !== "all" || search.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="todo-severity-filter">Severity</Label>
          <Select
            value={severityFilter}
            onValueChange={(v) => onSeverityFilterChange(v as TodoSeverityFilter)}
          >
            <SelectTrigger id="todo-severity-filter">
              <SelectValue placeholder="All severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="todo-module-filter">Module</Label>
          <Select value={moduleFilter} onValueChange={onModuleFilterChange}>
            <SelectTrigger id="todo-module-filter">
              <SelectValue placeholder="All modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modules</SelectItem>
              {modules.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="todo-search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search message, module, or field…"
            className="pl-8"
            aria-label="Search to-dos"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} className="rounded-full">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={onGenerate}
            disabled={generateDisabled}
            title={generateTitle}
            className="rounded-full"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate
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

      <p className="text-xs text-muted-foreground">
        {isMockDataEnabled
          ? "Mock mode: tasks are generated from local sample data. Turn off mock data in Settings to sync with Supabase."
          : "Live mode: Generate rescans employees, timesheets, and payroll data for new action items."}
      </p>
    </div>
  );
};

export default ToDosFiltersBar;
