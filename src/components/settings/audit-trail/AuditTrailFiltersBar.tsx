"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCcw, Search } from "lucide-react";
import { AUDIT_MODULES, AUDIT_SEVERITIES } from "@/lib/audit-trail";

interface AuditTrailFiltersBarProps {
  severity: string;
  onSeverityChange: (value: string) => void;
  module: string;
  onModuleChange: (value: string) => void;
  dateStart: string;
  onDateStartChange: (value: string) => void;
  dateEnd: string;
  onDateEndChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onClear: () => void;
  isRefreshing?: boolean;
}

const AuditTrailFiltersBar: React.FC<AuditTrailFiltersBarProps> = ({
  severity,
  onSeverityChange,
  module,
  onModuleChange,
  dateStart,
  onDateStartChange,
  dateEnd,
  onDateEndChange,
  search,
  onSearchChange,
  onRefresh,
  onClear,
  isRefreshing = false,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="audit-severity">Severity</Label>
          <Select value={severity} onValueChange={onSeverityChange}>
            <SelectTrigger id="audit-severity">
              <SelectValue placeholder="All severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              {AUDIT_SEVERITIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="audit-module">Module</Label>
          <Select value={module} onValueChange={onModuleChange}>
            <SelectTrigger id="audit-module">
              <SelectValue placeholder="All modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modules</SelectItem>
              {AUDIT_MODULES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="audit-date-start">From</Label>
          <Input
            id="audit-date-start"
            type="date"
            value={dateStart}
            onChange={(e) => onDateStartChange(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="audit-date-end">To</Label>
          <Input
            id="audit-date-end"
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
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search message, user, action, entity…"
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AuditTrailFiltersBar;
