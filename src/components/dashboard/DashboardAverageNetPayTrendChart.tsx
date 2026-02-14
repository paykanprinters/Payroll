"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";

interface AverageNetPayData {
  name: string;
  avgNetPay: number;
}

interface DashboardAverageNetPayTrendChartProps {
  averageNetPayTrend: AverageNetPayData[];
}

const DashboardAverageNetPayTrendChart: React.FC<DashboardAverageNetPayTrendChartProps> = ({ averageNetPayTrend }) => {
  const dataVisualsFontSize = useDataVisualsFontSize();

  return (
    <Card className="h-full rounded-2xl border bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>Average Net Pay Trend</CardTitle>
        <CardDescription>Average net pay per employee over recent months.</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={averageNetPayTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
            <YAxis tickFormatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} style={{ fontSize: dataVisualsFontSize }} />
            <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: dataVisualsFontSize }} />
            <Line type="monotone" dataKey="avgNetPay" stroke="#82ca9d" name="Average Net Pay" activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DashboardAverageNetPayTrendChart;