"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";

type Row = { name: string; value: number };

const COLORS = ["#00AEEF", "#EC008C", "#FFDE00", "#E62229", "#141414", "#6b6b6b"];

export default function DashboardTimesheetStatusChart({
  statusCounts,
}: {
  statusCounts: Row[];
}) {
  const dataVisualsFontSize = useDataVisualsFontSize();
  const total = statusCounts.reduce((sum, x) => sum + (x.value || 0), 0);

  const WrappedLegend = ({ payload }: any) => (
    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
      {(payload || []).map((entry: any) => {
        const pct = total > 0 ? Math.round((entry.payload?.value / total) * 100) : 0;
        return (
          <div
            key={entry.value}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-foreground/80">{entry.value}</span>
            <span>({pct}%)</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <Card className="h-full rounded-2xl border bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>Timesheet Workflow Status</CardTitle>
        <CardDescription>Distribution of timesheets by workflow stage.</CardDescription>
      </CardHeader>
      <CardContent className="h-[360px]">
        {total === 0 ? (
          <div className="flex h-full items-center justify-center py-10 text-sm text-muted-foreground">
            No timesheets yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusCounts}
                cx="50%"
                cy="46%"
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
              <Tooltip
                contentStyle={{ fontSize: dataVisualsFontSize }}
                labelStyle={{ fontSize: dataVisualsFontSize }}
              />
              <Legend
                verticalAlign="bottom"
                align="center"
                content={<WrappedLegend />}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}