"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { ReportAuditLevel, ReportPeriodType } from "@/lib/reports-admin-summary";

interface ReportsPeriodBarProps {
  periodType: ReportPeriodType;
  onPeriodTypeChange: (value: ReportPeriodType) => void;
  selectedDate: Date | undefined;
  onSelectedDateChange: (date: Date | undefined) => void;
  auditLevel: ReportAuditLevel;
  onAuditLevelChange: (value: ReportAuditLevel) => void;
  periodLabel: string;
  payslipCount: number;
}

const ReportsPeriodBar: React.FC<ReportsPeriodBarProps> = ({
  periodType,
  onPeriodTypeChange,
  selectedDate,
  onSelectedDateChange,
  auditLevel,
  onAuditLevelChange,
  periodLabel,
  payslipCount,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="report-period-type">Report frequency</Label>
          <Select value={periodType} onValueChange={(v) => onPeriodTypeChange(v as ReportPeriodType)}>
            <SelectTrigger id="report-period-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="report-date-picker">
            {periodType === "monthly" ? "Month" : "Year"}
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="report-date-picker"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate
                  ? periodType === "monthly"
                    ? format(selectedDate, "MMM yyyy")
                    : format(selectedDate, "yyyy")
                  : `Select ${periodType === "monthly" ? "month" : "year"}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={onSelectedDateChange}
                initialFocus
                captionLayout={periodType === "yearly" ? "dropdown-buttons" : "buttons"}
                fromYear={2010}
                toYear={new Date().getFullYear() + 1}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1">
          <Label htmlFor="report-audit-level">Payroll summary detail</Label>
          <Select value={auditLevel} onValueChange={(v) => onAuditLevelChange(v as ReportAuditLevel)}>
            <SelectTrigger id="report-audit-level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minimal">Minimal — totals only</SelectItem>
              <SelectItem value="standard">Standard — periods + deductions</SelectItem>
              <SelectItem value="detailed">Detailed — employee lines</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col justify-end rounded-lg border bg-muted/30 px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">Period in view</p>
          <p className="text-sm font-semibold">{periodLabel}</p>
          <p className="text-xs text-muted-foreground">{payslipCount} payslip{payslipCount === 1 ? "" : "s"}</p>
        </div>
      </div>
    </div>
  );
};

export default ReportsPeriodBar;
