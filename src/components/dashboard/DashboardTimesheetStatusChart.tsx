"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";

type Row = { name: string; value: number };

const COLORS = ["#4B9CD3", "#7ABA48", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]; 

export default function DashboardTimesheetStatusChart({
  statusCounts,
}: {
  statusCounts: Row[];
}) {
  const dataVisualsFontSize = useDataVisualsFontSize();
  const total = statusCounts.reduce((sum, x) => sum + (x.value || 0), 0);

  return (
    <Card className="h-full rounded-2xl border bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>Timesheet Workflow Status</CardTitle>
        <CardDescription>Distribution of timesheets by workflow stage.</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        {total === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No timesheets yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusCounts}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                labelLine={false}
                style={{ fontSize: dataVisualsFontSize }}
              >
                {statusCounts.map((entry, index) => (
                  <Cell key={`cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
              <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: dataVisualsFontSize }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
