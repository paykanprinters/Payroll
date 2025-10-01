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
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size"; // Import the new hook

interface LeaveAnalyticsProps {
  leaveTypeDistribution: { name: string; value: number }[];
  monthlyLeaveData: { name: string; days: number }[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const LeaveAnalytics: React.FC<LeaveAnalyticsProps> = ({ leaveTypeDistribution, monthlyLeaveData }) => {
  const dataVisualsFontSize = useDataVisualsFontSize(); // Use the new hook

  return (
    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 mt-6">
      <Card>
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
                innerRadius={60} // Added for Doughnut
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                labelLine={false} // Ensure no lines to labels
                // label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} // Removed label
                style={{ fontSize: dataVisualsFontSize }}
              >
                {leaveTypeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value} days`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
              <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
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
              <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} />
              <Bar dataKey="days" fill="#82ca9d" name="Working Days Taken" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveAnalytics;