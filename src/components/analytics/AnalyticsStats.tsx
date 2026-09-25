"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ReceiptText, TrendingUp, Palmtree } from "lucide-react";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import type { AnalyticsAdminSummary } from "@/lib/analytics-metrics";

interface AnalyticsStatsProps {
  summary: AnalyticsAdminSummary;
  periodLabel: string;
}

const formatZar = (value: number) =>
  `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const AnalyticsStats: React.FC<AnalyticsStatsProps> = ({ summary, periodLabel }) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="sky" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4 text-sky-600" />
            Gross payroll
          </CardTitle>
          <CardDescription className="text-xs">{periodLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatZar(summary.totalGross)}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Net {formatZar(summary.totalNet)}
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="emerald" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ReceiptText className="h-4 w-4 text-emerald-600" />
            Payslips
          </CardTitle>
          <CardDescription className="text-xs">In selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.payslipCount}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Avg net {formatZar(summary.avgNetPay)}
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="amber" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-amber-600" />
            Employees
          </CardTitle>
          <CardDescription className="text-xs">Active workforce</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.employeeCount}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Resigned and terminated staff drop off after their last day.
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="orange" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Palmtree className="h-4 w-4 text-orange-600" />
            Leave days
          </CardTitle>
          <CardDescription className="text-xs">Working days in period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.leaveDaysInPeriod}</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsStats;
