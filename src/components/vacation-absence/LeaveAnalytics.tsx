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

  const renderLegendText = (value: string, entry: any, total: number) => {
    const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(0) : 0;
    return `${value} (${percentage}%)`;
  };

  const totalLeaveDays = leaveTypeDistribution.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 mt-6">
      <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
        <SummaryAccent variant="sky" />
        <CardHeader>
          <CardTitle>Leave Type Distribution</CardTitle>
          <CardDescription>Breakdown of total working days taken by leave type.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={leaveTypeDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                labelLine={false}
                style={{ fontSize: dataVisualsFontSize }}
              >
                {leaveTypeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value} days`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
              <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: dataVisualsFontSize }} formatter={(value, entry) => renderLegendText(value, entry, totalLeaveDays)} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
        <SummaryAccent variant="emerald" />
        <CardHeader>
          <CardTitle>Monthly Leave Trends</CardTitle>
          <CardDescription>Total working days taken per month.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyLeaveData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
              <YAxis style={{ fontSize: dataVisualsFontSize }} />
              <Tooltip formatter={(value: number) => `${value} days`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: dataVisualsFontSize }} />
              <Bar dataKey="days" fill="#82ca9d" name="Working Days Taken" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveAnalytics;