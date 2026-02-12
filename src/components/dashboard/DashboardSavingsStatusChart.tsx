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
} from "recharts";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";

type Row = { name: string; value: number };

export default function DashboardSavingsStatusChart({ data }: { data: Row[] }) {
  const dataVisualsFontSize = useDataVisualsFontSize();
  const total = data.reduce((sum, x) => sum + (x.value || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Savings Plans Status</CardTitle>
        <CardDescription>Active savings entries grouped by status.</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        {total === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No savings entries yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
              <YAxis allowDecimals={false} style={{ fontSize: dataVisualsFontSize }} />
              <Tooltip contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: dataVisualsFontSize }} />
              <Bar dataKey="value" fill="#7ABA48" name="Entries" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
