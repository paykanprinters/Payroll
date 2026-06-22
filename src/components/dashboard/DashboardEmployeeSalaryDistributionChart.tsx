"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";
import ChartEmptyState from "@/components/dashboard/ChartEmptyState";

interface EmployeeSalaryDistributionData {
  range: string;
  count: number;
}

interface DashboardEmployeeSalaryDistributionChartProps {
  employeeSalaryDistribution: EmployeeSalaryDistributionData[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#a4de6c", "#d0ed57"];

const DashboardEmployeeSalaryDistributionChart: React.FC<DashboardEmployeeSalaryDistributionChartProps> = ({ employeeSalaryDistribution }) => {
  const dataVisualsFontSize = useDataVisualsFontSize();

  const totalEmployees = employeeSalaryDistribution.reduce((sum, row) => sum + row.count, 0);

  return (
    <Card className="h-full rounded-xl border bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>Employee Salary Distribution</CardTitle>
        <CardDescription>Number of employees within different salary ranges.</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        {totalEmployees === 0 ? (
          <ChartEmptyState message="Add employees with salary data to see distribution." />
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={employeeSalaryDistribution} margin={{ top: 8, right: 12, left: 4, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" style={{ fontSize: dataVisualsFontSize }} interval={0} />
            <YAxis allowDecimals={false} style={{ fontSize: dataVisualsFontSize }} />
            <Tooltip contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: dataVisualsFontSize }} />
            <Bar dataKey="count" fill="#FFBB28" name="Employees" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardEmployeeSalaryDistributionChart;