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
              <XAxis dataKey="name" />
              <YAxis formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} />
              <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} />
              <Legend />
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
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {deductionsBreakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayslipSummaryCharts;