"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";

interface EmployeeJobTitleData {
  name: string;
  value: number;
}

interface DashboardEmployeeJobTitleDistributionChartProps {
  employeeJobTitleData: EmployeeJobTitleData[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#a4de6c", "#d0ed57"];

const DashboardEmployeeJobTitleDistributionChart: React.FC<DashboardEmployeeJobTitleDistributionChartProps> = ({ employeeJobTitleData }) => {
  const dataVisualsFontSize = useDataVisualsFontSize();
  const totalJobTitles = employeeJobTitleData.reduce((sum, entry) => sum + entry.value, 0);

  const renderLegendText = (value: string, entry: any, total: number) => {
    const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(0) : 0;
    return `${value} (${percentage}%)`;
  };

  return (
    <Card className="h-full rounded-2xl border bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>Employee Distribution by Job Title</CardTitle>
        <CardDescription>Breakdown of employees across different roles.</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={employeeJobTitleData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              labelLine={false}
              style={{ fontSize: dataVisualsFontSize }}
            >
              {employeeJobTitleData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
            <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: dataVisualsFontSize }} formatter={(value, entry) => renderLegendText(value, entry, totalJobTitles)} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DashboardEmployeeJobTitleDistributionChart;