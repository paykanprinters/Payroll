"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";
import SummaryAccent from "@/components/dashboard/SummaryAccent";

interface LeaveAnalyticsProps {
  leaveTypeDistribution: { name: string; value: number }[];
  monthlyLeaveData: { name: string; days: number }[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const LeaveAnalytics: React.FC<LeaveAnalyticsProps> = ({ leaveTypeDistribution, monthlyLeaveData }) => {
  const dataVisualsFontSize = useDataVisualsFontSize();

  const renderLegendText = (value: string, entry: { payload?: { value?: number } }, total: number) => {
    const val = entry.payload?.value ?? 0;
    const percentage = total > 0 ? ((val / total) * 100).toFixed(0) : 0;
    return `${value} (${percentage}%)`;
  };

  const totalLeaveDays = leaveTypeDistribution.reduce((sum, entry) => sum + entry.value, 0);
  const hasDistribution = leaveTypeDistribution.length > 0;
  const hasMonthly = monthlyLeaveData.length > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="sky" />
        <CardHeader>
          <CardTitle className="text-base">Leave type distribution</CardTitle>
          <CardDescription>Working days taken by leave type in the current view.</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] sm:h-[300px]">
          {hasDistribution ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leaveTypeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={72}
                  fill="#8884d8"
                  dataKey="value"
                  labelLine={false}
                  style={{ fontSize: dataVisualsFontSize }}
                >
                  {leaveTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `${value} days`}
                  contentStyle={{ fontSize: dataVisualsFontSize }}
                  labelStyle={{ fontSize: dataVisualsFontSize }}
                />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{ fontSize: dataVisualsFontSize }}
                  formatter={(value, entry) =>
                    renderLegendText(value, entry as { payload?: { value?: number } }, totalLeaveDays)
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No leave data in the current view.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="emerald" />
        <CardHeader>
          <CardTitle className="text-base">Monthly leave trends</CardTitle>
          <CardDescription>Weekdays with recorded absences per month in the current view.</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] sm:h-[300px]">
          {hasMonthly ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyLeaveData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
                <YAxis style={{ fontSize: dataVisualsFontSize }} />
                <Tooltip
                  formatter={(value: number) => `${value} days`}
                  contentStyle={{ fontSize: dataVisualsFontSize }}
                  labelStyle={{ fontSize: dataVisualsFontSize }}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: dataVisualsFontSize }}
                />
                <Bar dataKey="days" fill="#82ca9d" name="Weekdays with leave" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No monthly trend data in the current view.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveAnalytics;
