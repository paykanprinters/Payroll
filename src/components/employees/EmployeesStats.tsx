"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SummaryAccent from "@/components/dashboard/SummaryAccent";

interface EmployeesStatsProps {
  totalCount: number;
  salaryCount: number;
  hourlyCount: number;
}

const EmployeesStats: React.FC<EmployeesStatsProps> = ({ totalCount, salaryCount, hourlyCount }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm">
        <SummaryAccent variant="sky" />
        <CardHeader className="pb-2">
          <CardTitle>Total Employees</CardTitle>
          <CardDescription>Organization size</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-semibold">{totalCount}</div>
        </CardContent>
      </Card>
      <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm">
        <SummaryAccent variant="emerald" />
        <CardHeader className="pb-2">
          <CardTitle>Salary-based</CardTitle>
          <CardDescription>Fixed compensation</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-semibold">{salaryCount}</div>
        </CardContent>
      </Card>
      <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm">
        <SummaryAccent variant="orange" />
        <CardHeader className="pb-2">
          <CardTitle>Hourly-based</CardTitle>
          <CardDescription>Time-based compensation</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-semibold">{hourlyCount}</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeesStats;