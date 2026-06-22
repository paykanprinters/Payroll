"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";
import ChartEmptyState from "@/components/dashboard/ChartEmptyState";

interface MonthlyPayrollData {
  name: string;
  payroll: number;
}

interface DashboardMonthlyPayrollOverviewChartProps {
  monthlyPayrollData: MonthlyPayrollData[];
}

const DashboardMonthlyPayrollOverviewChart: React.FC<DashboardMonthlyPayrollOverviewChartProps> = ({
  monthlyPayrollData,
}) => {
  const dataVisualsFontSize = useDataVisualsFontSize();

  return (
    <Card className="h-full rounded-xl border bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>Monthly Payroll Overview</CardTitle>
        <CardDescription>Total gross payroll amount per month.</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        {monthlyPayrollData.length === 0 ? (
          <ChartEmptyState message="No payroll data for the selected period." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyPayrollData} margin={{ top: 8, right: 12, left: 4, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
            <YAxis
              tickFormatter={(value: number) => `R ${value.toLocaleString("en-ZA")}`}
              style={{ fontSize: dataVisualsFontSize }}
            />
            <Tooltip
              formatter={(value: number) => `R ${value.toLocaleString("en-ZA")}`}
              contentStyle={{ fontSize: dataVisualsFontSize }}
              labelStyle={{ fontSize: dataVisualsFontSize }}
            />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ fontSize: dataVisualsFontSize }}
            />
            <Bar dataKey="payroll" fill="#8884d8" name="Payroll" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardMonthlyPayrollOverviewChart;
