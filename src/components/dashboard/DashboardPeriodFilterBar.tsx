"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardChartPeriod } from "@/lib/dashboard-admin-summary";

const PERIOD_LABELS: Record<DashboardChartPeriod, string> = {
  "3m": "Last 3 months",
  "6m": "Last 6 months",
  "12m": "Last 12 months",
  all: "All time",
};

interface DashboardPeriodFilterBarProps {
  period: DashboardChartPeriod;
  onPeriodChange: (period: DashboardChartPeriod) => void;
}

const DashboardPeriodFilterBar: React.FC<DashboardPeriodFilterBarProps> = ({
  period,
  onPeriodChange,
}) => {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">Analytics period</p>
        <p className="text-xs text-muted-foreground">
          Payroll and leave trend charts use the selected window.
        </p>
      </div>
      <div className="w-full sm:w-48">
        <Label htmlFor="dashboard-chart-period" className="sr-only">
          Chart period
        </Label>
        <Select value={period} onValueChange={(v) => onPeriodChange(v as DashboardChartPeriod)}>
          <SelectTrigger id="dashboard-chart-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PERIOD_LABELS) as DashboardChartPeriod[]).map((key) => (
              <SelectItem key={key} value={key}>
                {PERIOD_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default DashboardPeriodFilterBar;
