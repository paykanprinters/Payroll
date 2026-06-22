"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";
import ChartEmptyState from "@/components/dashboard/ChartEmptyState";

interface LeaveDaysTakenData {
  name: string;
  days: number;
}

interface DashboardMonthlyLeaveDaysTakenChartProps {
  leaveDaysTakenTrend: LeaveDaysTakenData[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#a4de6c", "#d0ed57"];

const DashboardMonthlyLeaveDaysTakenChart: React.FC<DashboardMonthlyLeaveDaysTakenChartProps> = ({ leaveDaysTakenTrend }) => {
  const dataVisualsFontSize = useDataVisualsFontSize();

  return (
    <Card className="h-full rounded-xl border bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>Monthly Leave Days Taken</CardTitle>
        <CardDescription>Total working days taken as leave per month.</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        {leaveDaysTakenTrend.length === 0 ? (
          <ChartEmptyState message="No leave records for the selected period." />
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={leaveDaysTakenTrend} margin={{ top: 8, right: 12, left: 4, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
            <YAxis allowDecimals={false} style={{ fontSize: dataVisualsFontSize }} />
            <Tooltip
              formatter={(value: number) => `${value} days`}
              contentStyle={{ fontSize: dataVisualsFontSize }}
              labelStyle={{ fontSize: dataVisualsFontSize }}
            />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: dataVisualsFontSize }} />
            <Bar dataKey="days" fill="#00C49F" name="Days" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardMonthlyLeaveDaysTakenChart;