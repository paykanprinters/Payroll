"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size"; // Import the new hook

interface MockPayslip {
  id: string;
  payPeriod: string;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
}

const Reports: React.FC = () => {
  const [monthlyPayrollTrend, setMonthlyPayrollTrend] = useState<{ name: string; gross: number; net: number }[]>([]);
  const dataVisualsFontSize = useDataVisualsFontSize(); // Use the new hook

  const loadReportData = () => {
    const storedPayslips = localStorage.getItem("mockPayslips");
    const payslips: MockPayslip[] = storedPayslips ? JSON.parse(storedPayslips) : [];

    // Aggregate payroll data by month (simplified for mock data)
    const monthlyDataMap = new Map<string, { gross: number; net: number }>();
    payslips.forEach(p => {
      const month = p.payPeriod.substring(5, 7); // e.g., "07" for July
      const year = p.payPeriod.substring(0, 4); // e.g., "2024"
      const monthYear = `${year}-${month}`;

      const current = monthlyDataMap.get(monthYear) || { gross: 0, net: 0 };
      monthlyDataMap.set(monthYear, {
        gross: current.gross + p.grossEarnings,
        net: current.net + p.netPay,
      });
    });

    // Convert map to array and sort by month
    const trendData = Array.from(monthlyDataMap.entries())
      .map(([monthYear, data]) => ({
        name: new Date(monthYear).toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        gross: data.gross,
        net: data.net,
      }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

    setMonthlyPayrollTrend(trendData);
  };

  useEffect(() => {
    loadReportData();
    window.addEventListener('mockDataUpdated', loadReportData);
    return () => {
      window.removeEventListener('mockDataUpdated', loadReportData);
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Payroll Reports & Analytics</h1>
      <p className="text-lg text-muted-foreground">
        Access various payroll reports, including tax summaries, deduction reports, and financial overviews.
      </p>
      
      <Card>
        <CardHeader>
          <CardTitle>Monthly Payroll Trend</CardTitle>
          <CardDescription>Gross and Net Pay trends over recent months.</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyPayrollTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
              <YAxis formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} style={{ fontSize: dataVisualsFontSize }} />
              <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
              <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} />
              <Line type="monotone" dataKey="gross" stroke="#8884d8" name="Gross Pay" activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="net" stroke="#82ca9d" name="Net Pay" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="mt-4 p-4 border rounded-lg bg-purple-50 text-purple-800">
        <h3 className="font-semibold text-lg mb-2">Reporting Tools</h3>
        <p className="text-sm">
          This area would contain filters for report generation (e.g., by date, department), and display various charts and tables summarizing payroll data.
        </p>
      </div>
    </div>
  );
};

export default Reports;