"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";
import CorePayrollReportsSection from "@/components/reports/CorePayrollReportsSection";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import ReportsHeader from "@/components/reports/ReportsHeader";

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
  const [selectedReportDate, setSelectedReportDate] = useState<Date | undefined>(new Date());
  const [reportPeriodType, setReportPeriodType] = useState<"monthly" | "yearly">("monthly");

  const dataVisualsFontSize = useDataVisualsFontSize();

  const loadReportData = React.useCallback(() => {
    const monthlyDataMap = new Map<string, { gross: number; net: number }>();
    payslips.forEach((p) => {
      const month = p.payPeriod.substring(5, 7);
      const year = p.payPeriod.substring(0, 4);
      const monthYear = `${year}-${month}`;

      const current = monthlyDataMap.get(monthYear) || { gross: 0, net: 0 };
      monthlyDataMap.set(monthYear, {
        gross: current.gross + p.grossEarnings,
        net: current.net + p.netPay,
      });
    });

    const trendData = Array.from(monthlyDataMap.entries())
      .map(([monthYear, data]) => ({
        name: new Date(monthYear).toLocaleString("en-US", { month: "short", year: "numeric" }),
        gross: data.gross,
        net: data.net,
      }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

    setMonthlyPayrollTrend(trendData);

    const savedReportDesignSettings = localStorage.getItem("reportDesignSettings");
    if (savedReportDesignSettings) {
      setReportDesignSettings(JSON.parse(savedReportDesignSettings));
    } else {
      localStorage.setItem("reportDesignSettings", JSON.stringify(DEFAULT_REPORT_DESIGN_SETTINGS));
      setReportDesignSettings(DEFAULT_REPORT_DESIGN_SETTINGS);
    }
  }, [payslips]);

  useEffect(() => {
    loadReportData();
    window.addEventListener("payslipsUpdated", loadReportData);
    window.addEventListener("companyDetailsUpdated", loadReportData);
    window.addEventListener("reportDesignUpdated", loadReportData);
    return () => {
      window.removeEventListener("payslipsUpdated", loadReportData);
      window.removeEventListener("companyDetailsUpdated", loadReportData);
      window.removeEventListener("reportDesignUpdated", loadReportData);
    };
  }, [loadReportData]);

  return (
    <div className="flex flex-col gap-4">
      <ReportsHeader />

      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md">
        <SummaryAccent variant="sky" />
        <CardHeader>
          <CardTitle>Report Period Selection</CardTitle>
          <CardDescription>Choose the period for which you want to generate reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="report-period-type">Report Type</Label>
              <Select onValueChange={(value: "monthly" | "yearly") => setReportPeriodType(value)} value={reportPeriodType}>
                <SelectTrigger id="report-period-type" className="mt-1 rounded-full">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly Report</SelectItem>
                  <SelectItem value="yearly">Yearly Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="report-date-picker">Select {reportPeriodType === "monthly" ? "Month" : "Year"}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "mt-1 w-full justify-start rounded-full text-left font-normal",
                      !selectedReportDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedReportDate ? (
                      reportPeriodType === "monthly"
                        ? format(selectedReportDate, "MMM yyyy")
                        : format(selectedReportDate, "yyyy")
                    ) : (
                      <span>Pick a {reportPeriodType === "monthly" ? "month" : "year"}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedReportDate}
                    onSelect={(date) => setSelectedReportDate(date)}
                    initialFocus
                    captionLayout={reportPeriodType === "yearly" ? "dropdown-buttons" : "buttons"}
                    fromYear={2010}
                    toYear={new Date().getFullYear() + 1}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md">
        <SummaryAccent variant="emerald" />
        <CardHeader>
          <CardTitle>Monthly Payroll Trend</CardTitle>
          <CardDescription>Gross vs Net pay totals over time.</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyPayrollTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
              <YAxis
                tickFormatter={(value: number) => `R ${value.toLocaleString("en-ZA")}`}
                style={{ fontSize: dataVisualsFontSize }}
              />
              <Tooltip
                formatter={(value: number) => `R ${value.toLocaleString("en-ZA")}`}
                contentStyle={{ fontSize: dataVisualsFontSize }}
                labelStyle={{ fontSize: dataVisualsFontSize }}
              />
              <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} />
              <Line type="monotone" dataKey="gross" stroke="#4f46e5" name="Gross" activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="net" stroke="#16a34a" name="Net" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <CorePayrollReportsSection
        employees={employees}
        payslips={payslips}
        leaveRecords={leaveRecords}
        companyDetails={companyDetails}
        reportDesignSettings={reportDesignSettings}
        selectedReportDate={selectedReportDate}
        reportPeriodType={reportPeriodType}
      />
    </div>
  );
};

export default Reports;