"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Wallet, Clock, Smartphone } from "lucide-react";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import type { EmployeesAdminSummary } from "@/lib/employees-admin-summary";

interface EmployeesStatsProps {
  summary: EmployeesAdminSummary;
}

const EmployeesStats: React.FC<EmployeesStatsProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="sky" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-sky-600" />
            In view
          </CardTitle>
          <CardDescription className="text-xs">Filtered employees</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold">{summary.total}</div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="emerald" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Wallet className="h-4 w-4 text-emerald-600" />
            Salary-based
          </CardTitle>
          <CardDescription className="text-xs">Fixed monthly compensation</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold">{summary.salaryCount}</div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="orange" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-orange-600" />
            Hourly-based
          </CardTitle>
          <CardDescription className="text-xs">Time-based compensation</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold">{summary.hourlyCount}</div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="rose" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Smartphone className="h-4 w-4 text-rose-600" />
            Portal access
          </CardTitle>
          <CardDescription className="text-xs">
            {summary.portalLinkedCount} linked · {summary.portalEnabledCount} enabled
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold">{summary.portalEnabledCount}</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeesStats;
