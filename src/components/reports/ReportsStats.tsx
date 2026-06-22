"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ReceiptText, Users, Scale } from "lucide-react";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import type { ReportsAdminSummary } from "@/lib/reports-admin-summary";

interface ReportsStatsProps {
  summary: ReportsAdminSummary;
  periodLabel: string;
}

const formatZar = (value: number) =>
  `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ReportsStats: React.FC<ReportsStatsProps> = ({ summary, periodLabel }) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="sky" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <DollarSign className="h-4 w-4 text-sky-600" />
            Gross payroll
          </CardTitle>
          <CardDescription className="text-xs">{periodLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatZar(summary.totalGross)}</div>
          <p className="mt-1 text-xs text-muted-foreground">Net {formatZar(summary.totalNet)}</p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="emerald" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ReceiptText className="h-4 w-4 text-emerald-600" />
            Payslips
          </CardTitle>
          <CardDescription className="text-xs">In reporting period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.payslipCount}</div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="amber" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-amber-600" />
            Employees paid
          </CardTitle>
          <CardDescription className="text-xs">Unique in period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.employeeCount}</div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="orange" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Scale className="h-4 w-4 text-orange-600" />
            Statutory
          </CardTitle>
          <CardDescription className="text-xs">PAYE + UIF + SDL</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatZar(summary.statutoryTotal)}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Deductions {formatZar(summary.totalDeductions)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsStats;
