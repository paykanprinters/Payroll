"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend as ReLegend
} from "recharts";

interface AverageSalaryChartProps {
  data: { name: string; salary: number }[];
  fontSize: number;
}

const AverageSalaryChart: React.FC<AverageSalaryChartProps> = ({ data, fontSize }) => {
  return (
    <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
      <SummaryAccent variant="emerald" />
      <CardHeader>
        <CardTitle>Average Salary by Job Title</CardTitle>
        <CardDescription>Comparison of average salaries across different job titles.</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" style={{ fontSize }} />
            <YAxis tickFormatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} style={{ fontSize }} />
            <ReTooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} contentStyle={{ fontSize }} labelStyle={{ fontSize }} />
            <ReLegend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize }} />
            <Bar dataKey="salary" fill="#82ca9d" name="Average Salary" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default AverageSalaryChart;