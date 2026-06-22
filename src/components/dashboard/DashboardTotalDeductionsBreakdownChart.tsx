"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";
import ChartEmptyState from "@/components/dashboard/ChartEmptyState";

interface DeductionsBreakdownData {
  name: string;
  value: number;
}

interface DashboardTotalDeductionsBreakdownChartProps {
  totalDeductionsBreakdown: DeductionsBreakdownData[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#a4de6c", "#d0ed57"];

const DashboardTotalDeductionsBreakdownChart: React.FC<DashboardTotalDeductionsBreakdownChartProps> = ({ totalDeductionsBreakdown }) => {
  const dataVisualsFontSize = useDataVisualsFontSize();
  const totalDeductions = totalDeductionsBreakdown.reduce((sum, entry) => sum + entry.value, 0);
  const hasData = totalDeductions > 0;

  const WrappedLegend = ({ payload }: any) => (
    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
      {(payload || []).map((entry: any) => {
        const pct = totalDeductions > 0 ? Math.round((entry.payload?.value / totalDeductions) * 100) : 0;
        return (
          <div key={entry.value} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
            <span className="text-foreground/80">{entry.value}</span>
            <span>({pct}%)</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <Card className="h-full rounded-xl border bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>Total Deductions Breakdown</CardTitle>
        <CardDescription>Distribution of total deductions across all payslips.</CardDescription>
      </CardHeader>
      <CardContent className="h-[380px]">
        {!hasData ? (
          <ChartEmptyState message="No deduction data for the selected period." />
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={totalDeductionsBreakdown}
              cx="50%"
              cy="46%"
              innerRadius={60}
              outerRadius={90}
              fill="#8884d8"
              dataKey="value"
              labelLine={false}
              style={{ fontSize: dataVisualsFontSize }}
            >
              {totalDeductionsBreakdown.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => `R ${value.toLocaleString("en-ZA")}`}
              contentStyle={{ fontSize: dataVisualsFontSize }}
              labelStyle={{ fontSize: dataVisualsFontSize }}
            />
            <Legend verticalAlign="bottom" align="center" content={<WrappedLegend />} />
          </PieChart>
        </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardTotalDeductionsBreakdownChart;