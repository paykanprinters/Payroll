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

interface PayrollSummaryData {
  name: string;
  gross: number;
  net: number;
}

interface DeductionsBreakdownData {
  name: string;
  value: number;
}

interface PayslipSummaryChartsProps {
  payrollSummaryData: PayrollSummaryData[];
  deductionsBreakdownData: DeductionsBreakdownData[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const formatCurrencyZAR = (n: number) =>
  `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PayslipSummaryCharts: React.FC<PayslipSummaryChartsProps> = ({
  payrollSummaryData,
  deductionsBreakdownData,
}) => {
  const dataVisualsFontSize = useDataVisualsFontSize();

  const renderLegendText = (
    value: string,
    entry: { payload?: { value?: number } },
    total: number
  ) => {
    const val = entry.payload?.value ?? 0;
    const percentage = total > 0 ? ((val / total) * 100).toFixed(0) : 0;
    return `${value} (${percentage}%)`;
  };

  const totalDeductions = deductionsBreakdownData.reduce((sum, entry) => sum + entry.value, 0);
  const hasPayroll = payrollSummaryData.some((row) => row.gross > 0 || row.net > 0);
  const hasDeductions = deductionsBreakdownData.length > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="sky" />
        <CardHeader>
          <CardTitle className="text-base">Gross vs net pay</CardTitle>
          <CardDescription>Comparison for payslips in the current view.</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] sm:h-[300px]">
          {hasPayroll ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payrollSummaryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
                <YAxis
                  tickFormatter={(value: number) => formatCurrencyZAR(value)}
                  style={{ fontSize: dataVisualsFontSize }}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrencyZAR(value)}
                  contentStyle={{ fontSize: dataVisualsFontSize }}
                  labelStyle={{ fontSize: dataVisualsFontSize }}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: dataVisualsFontSize }}
                />
                <Bar dataKey="gross" fill="#8884d8" name="Gross pay" />
                <Bar dataKey="net" fill="#82ca9d" name="Net pay" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No payroll totals in the current view.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="emerald" />
        <CardHeader>
          <CardTitle className="text-base">Deductions breakdown</CardTitle>
          <CardDescription>Aggregated deductions for payslips in the current view.</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] sm:h-[300px]">
          {hasDeductions ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deductionsBreakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={72}
                  fill="#8884d8"
                  dataKey="value"
                  labelLine={false}
                  style={{ fontSize: dataVisualsFontSize }}
                >
                  {deductionsBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrencyZAR(value)}
                  contentStyle={{ fontSize: dataVisualsFontSize }}
                  labelStyle={{ fontSize: dataVisualsFontSize }}
                />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{ fontSize: dataVisualsFontSize }}
                  formatter={(value, entry) =>
                    renderLegendText(value, entry as { payload?: { value?: number } }, totalDeductions)
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No deduction data in the current view.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PayslipSummaryCharts;
