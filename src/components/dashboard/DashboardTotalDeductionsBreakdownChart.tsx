"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";
import { formatCurrency } from "@/lib/utils";

interface DeductionsBreakdownData {
  name: string;
  value: number;
}

interface DashboardTotalDeductionsBreakdownChartProps {
  totalDeductionsBreakdown: DeductionsBreakdownData[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#a4de6c", "#d0ed57"];

const DashboardTotalDeductionsBreakdownChart: React.FC<DashboardTotalDeductionsBreakdownChartProps> = ({ totalDeductionsBreakdown }) => {
  const dataVisualsFontSize = useDataVisualsFontSize();
  const totalDeductions = totalDeductionsBreakdown.reduce((sum, entry) => sum + entry.value, 0);

  const renderLegendText = (value: string, entry: any, total: number) => {
    const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(0) : 0;
    return `${value} (${percentage}%)`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Total Deductions Breakdown</CardTitle>
        <CardDescription>Distribution of total deductions across all payslips.</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={totalDeductionsBreakdown}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              labelLine={false}
              style={{ fontSize: dataVisualsFontSize }}
            >
              {totalDeductionsBreakdown.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `R ${formatCurrency(value as number)}`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
            <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: dataVisualsFontSize }} formatter={(value, entry) => renderLegendText(value, entry, totalDeductions)} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DashboardTotalDeductionsBreakdownChart;