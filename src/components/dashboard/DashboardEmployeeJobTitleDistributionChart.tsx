"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";
import ChartEmptyState from "@/components/dashboard/ChartEmptyState";

interface EmployeeJobTitleData {
  name: string;
  value: number;
}

interface DashboardEmployeeJobTitleDistributionChartProps {
  employeeJobTitleData: EmployeeJobTitleData[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#a4de6c", "#d0ed57"];

const DashboardEmployeeJobTitleDistributionChart: React.FC<DashboardEmployeeJobTitleDistributionChartProps> = ({ employeeJobTitleData }) => {
  const dataVisualsFontSize = useDataVisualsFontSize();
  const totalJobTitles = employeeJobTitleData.reduce((sum, entry) => sum + entry.value, 0);
  const hasData = totalJobTitles > 0;

  const WrappedLegend = ({ payload }: any) => (
    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
      {(payload || []).map((entry: any) => {
        const pct = totalJobTitles > 0 ? Math.round((entry.payload?.value / totalJobTitles) * 100) : 0;
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
        <CardTitle>Employee Distribution by Job Title</CardTitle>
        <CardDescription>Breakdown of employees across different roles.</CardDescription>
      </CardHeader>
      <CardContent className="h-[380px]">
        {!hasData ? (
          <ChartEmptyState message="Add employees with job titles to see distribution." />
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={employeeJobTitleData}
              cx="50%"
              cy="46%"
              innerRadius={60}
              outerRadius={90}
              fill="#8884d8"
              dataKey="value"
              labelLine={false}
              style={{ fontSize: dataVisualsFontSize }}
            >
              {employeeJobTitleData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
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

export default DashboardEmployeeJobTitleDistributionChart;