"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";
import CorePayrollReportsSection from "@/components/reports/CorePayrollReportsSection";
import { MockEmployee, MockPayslip, LeaveEntry } from "@/lib/mock-data";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";

const DEFAULT_REPORT_DESIGN_SETTINGS: ReportDesignSettings = {
  defaultReportPaperSize: "A4",
  includeCompanyLogo: true,
  includeCompanyDetails: true,
  reportContentFontSize: 14,
  irp5ContentFontSize: 12,
};

const Reports: React.FC = () => {
  const { employees, payslips, leaveRecords, companyDetails } = usePayrollProcessor();

  const [monthlyPayrollTrend, setMonthlyPayrollTrend] = useState<{ name: string; gross: number; net: number }[]>([]);
  const [reportDesignSettings, setReportDesignSettings] = useState<ReportDesignSettings>(DEFAULT_REPORT_DESIGN_SETTINGS);

  const dataVisualsFontSize = useDataVisualsFontSize();

  const loadReportData = useCallback(() => {
    // Aggregate payroll data by month (simplified for mock data)
    const monthlyDataMap = new Map<string, { gross: number; net: number }>();
    payslips.forEach(p => {
      const month = p.payPeriod.substring(5, 7);
      const year = p.payPeriod.substring(0, 4);
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

    // Load report design settings
    const savedReportDesignSettings = localStorage.getItem("reportDesignSettings");
    if (savedReportDesignSettings) {
      setReportDesignSettings(JSON.parse(savedReportDesignSettings));
    } else {
      // If no settings saved, initialize with defaults and save them
      localStorage.setItem("reportDesignSettings", JSON.stringify(DEFAULT_REPORT_DESIGN_SETTINGS));
      setReportDesignSettings(DEFAULT_REPORT_DESIGN_SETTINGS);
    }
  }, [payslips]); // Depend only on payslips

  useEffect(() => {
    loadReportData();
    window.addEventListener('allMockDataUpdated', loadReportData); // Listen for allMockDataUpdated
    window.addEventListener('payslipsUpdated', loadReportData); // Listen for specific payslip updates
    window.addEventListener('companyDetailsUpdated', loadReportData);
    window.addEventListener('reportDesignUpdated', loadReportData);
    return () => {
      window.removeEventListener('allMockDataUpdated', loadReportData);
      window.removeEventListener('payslipsUpdated', loadReportData);
      window.removeEventListener('companyDetailsUpdated', loadReportData);
      window.removeEventListener('reportDesignUpdated', loadReportData);
    };
  }, [loadReportData]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Payroll Reports & Analytics</h1>
      <p className="text-lg text-muted-foreground">
        Access various payroll reports, including tax summaries, deduction reports, and financial overviews.
      </p>
      
      <CorePayrollReportsSection
        employees={employees}
        payslips={payslips}
        leaveRecords={leaveRecords}
        companyDetails={companyDetails}
        reportDesignSettings={reportDesignSettings}
      />

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
              <YAxis tickFormatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} style={{ fontSize: dataVisualsFontSize }} />
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