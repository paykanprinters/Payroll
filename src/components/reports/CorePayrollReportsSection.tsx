"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, DollarSign, Scale, CalendarDays, Clock, Building2, Banknote } from "lucide-react";
import { showSuccess } from "@/utils/toast";

interface ReportItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
  onGenerate: () => void;
}

const ReportItem: React.FC<ReportItemProps> = ({ icon: Icon, title, description, onGenerate }) => (
  <Card className="flex flex-col">
    <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
      <Icon className="h-6 w-6 text-primary" />
      <CardTitle className="text-lg font-semibold">{title}</CardTitle>
    </CardHeader>
    <CardContent className="flex-1">
      <CardDescription className="text-sm text-muted-foreground mb-4">
        {description}
      </CardDescription>
      <Button onClick={onGenerate} variant="outline" className="w-full">
        Generate Report
      </Button>
    </CardContent>
  </Card>
);

const CorePayrollReportsSection: React.FC = () => {
  const handleGenerateReport = (reportName: string) => {
    showSuccess(`Generating "${reportName}" report... (This is a placeholder action)`);
    console.log(`Attempting to generate report: ${reportName}`);
    // In a real application, this would trigger a backend call to generate and download the report.
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Core Payroll Reports</CardTitle>
        <CardDescription>
          Access foundational reports for compliance, audits, and HR operations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <ReportItem
            icon={DollarSign}
            title="Payroll Summary Report"
            description="Overview of total salaries, deductions, and net pay per pay period."
            onGenerate={() => handleGenerateReport("Payroll Summary Report")}
          />
          <ReportItem
            icon={FileText}
            title="Employee Payslip Report"
            description="Individual breakdowns showing gross pay, deductions, benefits, and net pay."
            onGenerate={() => handleGenerateReport("Employee Payslip Report")}
          />
          <ReportItem
            icon={Scale}
            title="Tax and Statutory Reports"
            description="Includes PAYE, UIF, SDL, and other local tax obligations—critical for SARS compliance."
            onGenerate={() => handleGenerateReport("Tax and Statutory Reports")}
          />
          <ReportItem
            icon={CalendarDays}
            title="Leave and Absence Report"
            description="Tracks annual leave, sick leave, and unpaid leave balances."
            onGenerate={() => handleGenerateReport("Leave and Absence Report")}
          />
          <ReportItem
            icon={Clock}
            title="Overtime and Bonus Report"
            description="Details extra hours worked and incentive payouts."
            onGenerate={() => handleGenerateReport("Overtime and Bonus Report")}
          />
          <ReportItem
            icon={Building2}
            title="Departmental Cost Report"
            description="Shows payroll expenses by department or cost center—great for budgeting."
            onGenerate={() => handleGenerateReport("Departmental Cost Report")}
          />
          <ReportItem
            icon={Banknote}
            title="Bank Transfer Report"
            description="Lists payment instructions for salary disbursement."
            onGenerate={() => handleGenerateReport("Bank Transfer Report")}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default CorePayrollReportsSection;