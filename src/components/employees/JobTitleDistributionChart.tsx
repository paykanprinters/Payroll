"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  Legend as ReLegend
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#a4de6c", "#d0ed57"];

interface JobTitleDistributionChartProps {
  data: { name: string; value: number }[];
  fontSize: number;
}

type LegendEntry = { payload?: { value?: number } };

const JobTitleDistributionChart: React.FC<JobTitleDistributionChartProps> = ({ data, fontSize }) => {
  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  const renderLegendText = (value: string, entry: LegendEntry) => {
    const percentage = total > 0 ? (((entry.payload?.value ?? 0) / total) * 100).toFixed(0) : "0";
    return `${value} (${percentage}%)`;
  };

  return (
    <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
      <SummaryAccent variant="sky" />
      <CardHeader>
        <CardTitle>Employee Distribution by Job Title</CardTitle>
        <CardDescription>Visual breakdown of employees across different roles.</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              labelLine={false}
              style={{ fontSize }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <ReTooltip contentStyle={{ fontSize }} labelStyle={{ fontSize }} />
            <ReLegend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize }} formatter={(value, entry) => renderLegendText(value, entry)} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default JobTitleDistributionChart;