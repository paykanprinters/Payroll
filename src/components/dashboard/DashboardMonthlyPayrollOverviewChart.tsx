"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";

interface MonthlyPayrollData {
  name: string;
  payroll: number;
}

interface DashboardMonthlyPayrollOverviewChartProps {
  monthlyPayrollData: MonthlyPayrollData[];
}

const DashboardMonthlyPayrollOverviewChart: React.FC<DashboardMonthlyPayrollOverviewChartProps> = ({ monthlyPayrollData }) => {
  const dataVisualsFontSize = useDataVisualsFontSize();

  return (
    <Card className="h-full rounded-2xl border bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>Monthly Payroll Overview</CardTitle>
        <CardDescription>Total gross payroll amount per month.</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyPayrollData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
            <YAxis tickFormatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} style={{ fontSize: dataVisualsFontSize }} />
            <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: dataVisualsFontSize }} />
            <Bar dataKey="payroll" fill="#8884d8" name="Total Payroll" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DashboardMonthlyPayrollOverviewChart;