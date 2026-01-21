"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, DollarSign, Scale, CalendarDays, Clock, Building2, Banknote, UserPlus, Users, Wallet, ScrollText } from "lucide-react";
import ReportPreviewDialog from "./ReportPreviewDialog";
import {
  generatePayrollSummaryReportContent,
  generateEmployeePayslipReportContent,
  generateTaxStatutoryReportContent,
  generateLeaveAbsenceReportContent,
  generateOvertimeBonusReportContent,
  generateDepartmentalCostReportContent,
  generateBankTransferReportContent,
  generateNewHiresTerminationsReportContent,
  generateEmployeeDemographicsReportContent,
  generateBenefitDeductionsReportContent,
  generateAuditTrailReportContent,
} from "@/lib/report-generators";
import { MockEmployee, MockPayslip, LeaveEntry } from "@/lib/mock-data";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import SummaryAccent from "@/components/dashboard/SummaryAccent";

interface ReportItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
  onGenerate: (reportTitle: string, reportContent: string, documentType: 'payslip' | 'report') => void;
  reportContentGenerator: (employees: MockEmployee[], payslips: MockPayslip[], leaveRecords: LeaveEntry[], selectedDate: Date | undefined, periodType: "monthly" | "yearly") => string;
  employees: MockEmployee[];
  payslips: MockPayslip[];
  leaveRecords: LeaveEntry[];
  selectedReportDate: Date | undefined;
  reportPeriodType: "monthly" | "yearly";
}

const ReportItem: React.FC<ReportItemProps> = ({
  icon: Icon,
  title,
  description,
  onGenerate,
  reportContentGenerator,
  employees,
  payslips,
  leaveRecords,
  selectedReportDate,
  reportPeriodType,
}) => {
  const handleGenerateClick = () => {
    const content = reportContentGenerator(employees, payslips, leaveRecords, selectedReportDate, reportPeriodType);
    onGenerate(title, content, 'report');
  };

  return (
    <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <SummaryAccent variant="emerald" />
      <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-indigo-100 text-indigo-600">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <CardDescription className="text-sm text-muted-foreground mb-4">
          {description}
        </CardDescription>
        <Button onClick={handleGenerateClick} variant="outline" className="w-full rounded-full">
          Generate Report
        </Button>
      </CardContent>
    </Card>
  );
};

interface CorePayrollReportsSectionProps {
  employees: MockEmployee[];
  payslips: MockPayslip[];
  leaveRecords: LeaveEntry[];
  companyDetails: MockCompanyDetails | null;
  reportDesignSettings: ReportDesignSettings;
  selectedReportDate: Date | undefined;
  reportPeriodType: "monthly" | "yearly";
}

const CorePayrollReportsSection: React.FC<CorePayrollReportsSectionProps> = ({
  employees,
  payslips,
  leaveRecords,
  companyDetails,
  reportDesignSettings,
  selectedReportDate,
  reportPeriodType,
}) => {
  const [isReportPreviewOpen, setIsReportPreviewOpen] = React.useState(false);
  const [currentReportTitle, setCurrentReportTitle] = React.useState("");
  const [currentReportContent, setCurrentReportContent] = React.useState("");
  const [currentDocumentType, setCurrentDocumentType] = React.useState<'payslip' | 'report'>('report');

  const handleOpenReportPreview = (title: string, content: string, documentType: 'payslip' | 'report') => {
    setCurrentReportTitle(title);
    setCurrentReportContent(content);
    setCurrentDocumentType(documentType);
    setIsReportPreviewOpen(true);
  };

  return (
    <>
      <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
        <SummaryAccent variant="sky" />
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
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(emps, pslps, lvs, date, type) => generatePayrollSummaryReportContent(pslps, emps, date, type)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
            />
            <ReportItem
              icon={FileText}
              title="Employee Payslip Report"
              description="Individual breakdowns showing gross pay, deductions, benefits, and net pay."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(emps, pslps, lvs, date, type) => generateEmployeePayslipReportContent(pslps, emps, date, type)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
            />
            <ReportItem
              icon={Scale}
              title="Tax and Statutory Reports"
              description="Includes PAYE, UIF, SDL, and other local tax obligations—critical for SARS compliance."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(emps, pslps, lvs, date, type) => generateTaxStatutoryReportContent(pslps, emps, date, type)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
            />
            <ReportItem
              icon={CalendarDays}
              title="Leave and Absence Report"
              description="Tracks annual leave, sick leave, and unpaid leave balances."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(emps, pslps, lvs, date, type) => generateLeaveAbsenceReportContent(lvs, emps, date, type)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
            />
            <ReportItem
              icon={Clock}
              title="Overtime and Bonus Report"
              description="Details extra hours worked and incentive payouts."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(emps, pslps, lvs, date, type) => generateOvertimeBonusReportContent(pslps, emps, date, type)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
            />
            <ReportItem
              icon={Building2}
              title="Departmental Cost Report"
              description="Shows payroll expenses by department or cost center—great for budgeting."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(emps, pslps, lvs, date, type) => generateDepartmentalCostReportContent(pslps, emps, date, type)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
            />
            <ReportItem
              icon={Banknote}
              title="Bank Transfer Report"
              description="Lists payment instructions for salary disbursement."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(emps, pslps, lvs, date, type) => generateBankTransferReportContent(pslps, emps, date, type)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
            />
            <ReportItem
              icon={UserPlus}
              title="New Hires & Terminations Report"
              description="Tracks employee onboarding and offboarding activities."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(emps, pslps, lvs, date, type) => generateNewHiresTerminationsReportContent(emps, date, type)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
            />
            <ReportItem
              icon={Users}
              title="Employee Demographics Report"
              description="Insights into workforce composition by job title and salary range."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(emps, pslps, lvs, date, type) => generateEmployeeDemographicsReportContent(emps, date, type)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
            />
            <ReportItem
              icon={Wallet}
              title="Benefit Deductions Report"
              description="Detailed breakdown of non-statutory benefit deductions."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(emps, pslps, lvs, date, type) => generateBenefitDeductionsReportContent(pslps, emps, date, type)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
            />
            <ReportItem
              icon={ScrollText}
              title="Audit Trail Report"
              description="Logs significant system actions and changes for security and compliance."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(emps, pslps, lvs, date, type) => generateAuditTrailReportContent(date, type)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
            />
          </div>
        </CardContent>
      </Card>

      <ReportPreviewDialog
        isOpen={isReportPreviewOpen}
        onClose={() => setIsReportPreviewOpen(false)}
        reportTitle={currentReportTitle}
        reportContent={currentReportContent}
        companyDetails={companyDetails}
        reportDesignSettings={reportDesignSettings}
        documentType={currentDocumentType}
      />
    </>
  );
};

export default CorePayrollReportsSection;