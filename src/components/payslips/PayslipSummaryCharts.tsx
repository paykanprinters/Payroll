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
import { formatCurrency } from "@/lib/utils";

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

const PayslipSummaryCharts: React.FC<PayslipSummaryChartsProps> = ({
  payrollSummaryData,
  deductionsBreakdownData,
}) => {
  const dataVisualsFontSize = useDataVisualsFontSize(); // Use the new hook

  // Log the deductions breakdown data here
  console.log("PayslipSummaryCharts: Deductions Breakdown Data:", deductionsBreakdownData);

  // Helper for PieChart legend formatter
  const renderLegendText = (value: string, entry: any, total: number) => {
    const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(0) : 0;
    return `${value} (${percentage}%)`;
  };

  const totalDeductions = deductionsBreakdownData.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Total Gross vs. Net Pay</CardTitle>
          <CardDescription>Comparison of total gross earnings and net pay across all generated payslips.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={payrollSummaryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
              <YAxis tickFormatter={(value: number) => `R ${formatCurrency(value)}`} style={{ fontSize: dataVisualsFontSize }} />
              <Tooltip formatter={(value: number) => `R ${formatCurrency(value as number)}`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: dataVisualsFontSize }} />
              <Bar dataKey="gross" fill="#8884d8" name="Gross Pay" />
              <Bar dataKey="net" fill="#82ca9d" name="Net Pay" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deductions Breakdown</CardTitle>
          <CardDescription>Distribution of total deductions across all payslips.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={deductionsBreakdownData}
                cx="50%"
                cy="50%"
                innerRadius={60} // Added for Doughnut
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                labelLine={false} // Ensure no lines to labels
                style={{ fontSize: dataVisualsFontSize }}
              >
                {deductionsBreakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `R ${formatCurrency(value as number)}`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
              <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: dataVisualsFontSize }} formatter={(value, entry) => renderLegendText(value, entry, totalDeductions)} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayslipSummaryCharts;