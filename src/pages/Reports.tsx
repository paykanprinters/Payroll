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
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";
import CorePayrollReportsSection from "@/components/reports/CorePayrollReportsSection";
import { MockEmployee, MockPayslip, LeaveEntry } from "@/lib/mock-data-interfaces";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";

const DEFAULT_REPORT_DESIGN_SETTINGS: ReportDesignSettings = {
  defaultReportPaperSize: "A4",
  includeCompanyLogo: true,
  includeCompanyDetails: true,
  reportContentFontSize: 14,
  irp5ContentFontSize: 12, // Added irp5ContentFontSize
};

const Reports: React.FC = () => {
  const [monthlyPayrollTrend, setMonthlyPayrollTrend] = useState<{ name: string; gross: number; net: number }[]>([]);
  const [employees, setEmployees] = useState<MockEmployee[]>([]);
  const [payslips, setPayslips] = useState<MockPayslip[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveEntry[]>([]);

  // Company details for reports
  const [companyLegalName, setCompanyLegalName] = useState<string>("");
  const [companyTradingName, setCompanyTradingName] = useState<string>("");
  const [physicalAddress, setPhysicalAddress] = useState<string>("");
  const [mainContactNumber, setMainContactNumber] = useState<string>("");
  const [companyEmail, setCompanyEmail] = useState<string>("");
  const [companyWebsite, setCompanyWebsite] = useState<string>("");
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState<string>("");
  const [vatRegistrationNumber, setVatRegistrationNumber] = useState<string>("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [companyLogoSize, setCompanyLogoSize] = useState<number>(40);

  const [reportDesignSettings, setReportDesignSettings] = useState<ReportDesignSettings>(DEFAULT_REPORT_DESIGN_SETTINGS);


  const dataVisualsFontSize = useDataVisualsFontSize();

  const loadReportData = () => {
    const storedPayslips = localStorage.getItem("mockPayslips");
    const loadedPayslips: MockPayslip[] = storedPayslips ? JSON.parse(storedPayslips) : [];
    setPayslips(loadedPayslips);

    const storedEmployees = localStorage.getItem("mockEmployees");
    const loadedEmployees: MockEmployee[] = storedEmployees ? JSON.parse(storedEmployees) : [];
    setEmployees(loadedEmployees);

    const storedLeaveRecords = localStorage.getItem("mockLeaveRecords");
    const loadedLeaveRecords: LeaveEntry[] = storedLeaveRecords ? JSON.parse(storedLeaveRecords) : [];
    setLeaveRecords(loadedLeaveRecords);

    // Aggregate payroll data by month (simplified for mock data)
    const monthlyDataMap = new Map<string, { gross: number; net: number }>();
    loadedPayslips.forEach(p => {
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

    // Load company details
    setCompanyLegalName(localStorage.getItem('companyLegalName') || "Your Company Legal Name");
    setCompanyTradingName(localStorage.getItem('companyTradingName') || "Your Company Trading Name");
    setPhysicalAddress(localStorage.getItem('physicalAddress') || "123 Corporate Ave, Business City, 1234");
    setMainContactNumber(localStorage.getItem('mainContactNumber') || "+27 11 123 4567");
    setCompanyEmail(localStorage.getItem('companyEmail') || "info@yourcompany.co.za");
    setCompanyWebsite(localStorage.getItem('companyWebsite') || "www.yourcompany.co.za");
    setCompanyRegistrationNumber(localStorage.getItem('companyRegistrationNumber') || "N/A");
    setVatRegistrationNumber(localStorage.getItem('vatRegistrationNumber') || "N/A");
    setCompanyLogoUrl(localStorage.getItem('companyLogoUrl'));
    setCompanyLogoSize(parseFloat(localStorage.getItem('companyLogoSize') || '40'));

    // Load report design settings
    const savedReportDesignSettings = localStorage.getItem("reportDesignSettings");
    if (savedReportDesignSettings) {
      setReportDesignSettings(JSON.parse(savedReportDesignSettings));
    } else {
      // If no settings saved, initialize with defaults and save them
      localStorage.setItem("reportDesignSettings", JSON.stringify(DEFAULT_REPORT_DESIGN_SETTINGS));
      setReportDesignSettings(DEFAULT_REPORT_DESIGN_SETTINGS);
    }
  };

  useEffect(() => {
    loadReportData();
    window.addEventListener('mockDataUpdated', loadReportData);
    window.addEventListener('companyDetailsUpdated', loadReportData); // Listen for company detail updates
    window.addEventListener('reportDesignUpdated', loadReportData); // Listen for report design updates
    return () => {
      window.removeEventListener('mockDataUpdated', loadReportData);
      window.removeEventListener('companyDetailsUpdated', loadReportData);
      window.removeEventListener('reportDesignUpdated', loadReportData);
    };
  }, []);

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
        companyLegalName={companyLegalName}
        companyTradingName={companyTradingName}
        physicalAddress={physicalAddress}
        mainContactNumber={mainContactNumber}
        companyEmail={companyEmail}
        companyWebsite={companyWebsite}
        companyRegistrationNumber={companyRegistrationNumber}
        vatRegistrationNumber={vatRegistrationNumber}
        companyLogoUrl={companyLogoUrl}
        companyLogoSize={companyLogoSize}
        reportDesignSettings={reportDesignSettings} // Pass report design settings
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